#!/usr/bin/env bash
#
# Server-side deploy for the 3alemni staging LXC.
#
# Uploaded to the server by .github/workflows/deploy.yml and executed there.
# Can also be run by hand on the server:
#
#   ./deploy.sh ghcr.io/<owner>/<repo>:sha-abc1234
#   ./deploy.sh "$(cat .image.prev)"    # roll back to the previous image
#
# The image is always built by GitHub Actions and pulled here - never built on
# the LXC, which has a 2 GiB root disk and little RAM.
#
# COMPOSE_FILES (space separated) selects the stack. The default is the staging
# stack; add docker/docker-compose.1vcpu.yml when RAM is genuinely tight, and set
# REQUIRE_MEM_LIMIT=true to refuse deploys whose app service has no memory limit.
#
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/var/www/3alemni}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-300}"
FALLBACK_IMAGE="${FALLBACK_IMAGE:-3alemni-api:staging}"
REQUIRE_MEM_LIMIT="${REQUIRE_MEM_LIMIT:-false}"
# DRY_RUN=true rehearses everything up to (but not including) restarting the stack.
DRY_RUN="${DRY_RUN:-false}"

IMAGE="${1:-}"
if [[ -z "$IMAGE" ]]; then
    echo "usage: $0 <image-reference>" >&2
    exit 2
fi

cd "$DEPLOY_DIR"

if [[ ! -f .env ]]; then
    echo "FATAL: $DEPLOY_DIR/.env is missing. Refusing to deploy." >&2
    exit 1
fi

read -r -a COMPOSE_FILES <<<"${COMPOSE_FILES:-docker/docker-compose.yml docker/docker-compose.staging.yml docker/docker-compose.runtime.yml}"

for f in "${COMPOSE_FILES[@]}"; do
    if [[ ! -f "$f" ]]; then
        echo "FATAL: $f is missing. Refusing to deploy an incomplete compose stack." >&2
        exit 1
    fi
done

if [[ " ${COMPOSE_FILES[*]} " != *" docker/docker-compose.runtime.yml "* ]]; then
    echo "FATAL: docker/docker-compose.runtime.yml must be in COMPOSE_FILES," >&2
    echo "       otherwise APP_IMAGE is ignored and the pulled image is never used." >&2
    exit 1
fi

compose() {
    local args=()
    for f in "${COMPOSE_FILES[@]}"; do args+=(-f "$f"); done
    docker compose --env-file .env "${args[@]}" "$@"
}

# Optional guard: the resolved config must carry a memory limit on the app.
assert_limits() {
    [[ "$REQUIRE_MEM_LIMIT" == "true" ]] || return 0

    # `config app` also emits postgres/redis (dependencies), so look only
    # inside the app service block.
    if ! compose config app 2>/dev/null \
        | awk '/^  app:$/ {f=1; next} f && /^  [^ ]/ {f=0} f' \
        | grep -qE '^\s+(mem_limit|memory):'; then
        echo "FATAL: resolved compose config has no memory limit on the app service." >&2
        echo "       Add docker/docker-compose.1vcpu.yml to COMPOSE_FILES or unset REQUIRE_MEM_LIMIT." >&2
        exit 1
    fi
    echo "==> Memory limit check passed"
}

# The container id changes on every recreate, so resolve it on each poll
# instead of relying on a hardcoded container name.
app_container() {
    compose ps -q app 2>/dev/null | head -1
}

wait_for_health() {
    local deadline=$((SECONDS + HEALTH_TIMEOUT))
    local id status

    while ((SECONDS < deadline)); do
        id="$(app_container)"
        status="missing"
        if [[ -n "$id" ]]; then
            status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
                "$id" 2>/dev/null || echo "missing")"
        fi

        case "$status" in
            healthy) return 0 ;;
            unhealthy)
                echo "Container reported unhealthy." >&2
                return 1
                ;;
            *) ;; # starting, missing, none: not up yet
        esac

        sleep 5
    done

    echo "Timed out after ${HEALTH_TIMEOUT}s waiting for the app container to become healthy." >&2
    return 1
}

# The root disk is tiny: drop every tag of this image repository except the
# ones passed as arguments.
prune_old_images() {
    [[ "$IMAGE" == *"/"* ]] || return 0
    local repo="${IMAGE%:*}" ref keep skip
    docker image ls "$repo" --format '{{.Repository}}:{{.Tag}}' | while read -r ref; do
        skip=false
        for keep in "$@"; do
            [[ "$ref" == "$keep" ]] && skip=true
        done
        if [[ "$skip" == false ]]; then
            echo "    removing $ref"
            docker image rm "$ref" >/dev/null 2>&1 || true
        fi
    done
    docker image prune -f >/dev/null 2>&1 || true
}

# What to fall back to. Before the first CI deploy there is no .image file, so
# the fallback is whatever image the server was started with by hand.
PREVIOUS_IMAGE="$FALLBACK_IMAGE"
if [[ -f .image ]]; then
    PREVIOUS_IMAGE="$(cat .image)"
fi

echo "==> Deploying $IMAGE"
echo "==> Compose files: ${COMPOSE_FILES[*]}"
echo "==> Rollback target if this fails: $PREVIOUS_IMAGE"

export APP_IMAGE="$IMAGE"
compose config --quiet
assert_limits

if [[ "$IMAGE" == *"/"* ]]; then
    echo "==> Freeing disk before pull"
    prune_old_images "$PREVIOUS_IMAGE" "$IMAGE"
    df -h / | tail -1

    # Plain `docker pull`, not `compose pull`: the app service still declares a
    # build: section, and we never want a build attempted on this box.
    echo "==> Pulling image"
    docker pull "$IMAGE"
else
    echo "==> Using local image $IMAGE (no registry path, skipping pull)"
fi

if [[ "$DRY_RUN" == "true" || "$DRY_RUN" == "1" ]]; then
    id="$(app_container)"
    echo
    echo "==> DRY RUN - stopping here. Nothing was restarted."
    echo "==> Resolved image:    $APP_IMAGE"
    if [[ -n "$id" ]]; then
        echo "==> Currently running: $(docker inspect "$id" --format '{{.Config.Image}}')"
        echo "==> Container status:  $(docker inspect "$id" --format '{{.State.Status}} ({{if .State.Health}}{{.State.Health.Status}}{{else}}no healthcheck{{end}})')"
    else
        echo "==> Currently running: none"
    fi
    echo
    echo "==> Re-run with dry_run unchecked to deploy for real."
    exit 0
fi

echo "==> Starting stack"
compose up -d --no-build --remove-orphans

echo "==> Waiting for health check (timeout ${HEALTH_TIMEOUT}s)"
if wait_for_health; then
    echo "$IMAGE" >.image
    if [[ "$PREVIOUS_IMAGE" != "$IMAGE" ]]; then
        echo "$PREVIOUS_IMAGE" >.image.prev
    fi

    echo "==> Pruning old images"
    prune_old_images "$IMAGE" "$PREVIOUS_IMAGE"
    df -h / | tail -1

    echo "==> Deploy succeeded: $IMAGE"
    exit 0
fi

echo "==> Deploy FAILED. Recent application logs:" >&2
compose logs --tail 100 app >&2 || true

if [[ "$PREVIOUS_IMAGE" != "$IMAGE" ]]; then
    echo "==> Rolling back to $PREVIOUS_IMAGE" >&2
    export APP_IMAGE="$PREVIOUS_IMAGE"

    if compose up -d --no-build --remove-orphans && wait_for_health; then
        echo "==> Rollback succeeded. Staging is serving $PREVIOUS_IMAGE." >&2
    else
        echo "==> ROLLBACK FAILED. Staging needs manual attention." >&2
    fi
else
    echo "==> No different image to roll back to." >&2
fi

exit 1
