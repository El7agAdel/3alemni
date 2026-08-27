#!/usr/bin/env bash
#
# Server-side production deploy.
#
# Uploaded to the server by .github/workflows/deploy.yml and executed there.
# Can also be run by hand on the server:
#
#   ./deploy.sh ghcr.io/<owner>/<repo>:sha-abc1234
#   ./deploy.sh "$(cat .image.prev)"    # roll back to the previous image
#   ./deploy.sh app-api:prod            # back to a locally built image
#
# It composes ALL FOUR files. docker-compose.1vcpu.yml carries the memory limits
# a 1 GB box depends on (app 400M, postgres 300M, redis 128M); leaving it out
# lets the stack request ~3.5 GB and OOM the machine. Drop that file from
# COMPOSE_FILES only if you also raise the limits in docker-compose.prod.yml.
#
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/var/www/app-api}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"
FALLBACK_IMAGE="${FALLBACK_IMAGE:-app-api:prod}"
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

# Container names come from APP_SLUG, the same variable the compose files
# interpolate, so a renamed app needs no edit here.
if [[ -z "${APP_SLUG:-}" ]]; then
    APP_SLUG="$(sed -n 's/^APP_SLUG=//p' .env | head -1 | tr -d '"'"'"' \r')"
fi
APP_SLUG="${APP_SLUG:-app}"
CONTAINER="${CONTAINER:-${APP_SLUG}-production-app}"

COMPOSE_FILES=(
    docker/docker-compose.yml
    docker/docker-compose.prod.yml
    docker/docker-compose.1vcpu.yml
    docker/docker-compose.runtime.yml
)

for f in "${COMPOSE_FILES[@]}"; do
    if [[ ! -f "$f" ]]; then
        echo "FATAL: $f is missing. Refusing to deploy without the full compose stack" >&2
        echo "       - dropping docker-compose.1vcpu.yml would OOM this droplet." >&2
        exit 1
    fi
done

compose() {
    local args=()
    for f in "${COMPOSE_FILES[@]}"; do args+=(-f "$f"); done
    docker compose --env-file .env "${args[@]}" "$@"
}

# Guard: the resolved config must still carry a memory limit on the app.
assert_limits() {
    local mem
    mem="$(compose config --format json 2>/dev/null \
        | python3 -c 'import json,sys; print(json.load(sys.stdin)["services"]["app"].get("mem_limit",0))' 2>/dev/null || echo 0)"

    if [[ "$mem" == "0" || -z "$mem" ]]; then
        echo "FATAL: resolved compose config has no memory limit on the app service." >&2
        echo "       Refusing to deploy - this would OOM the droplet." >&2
        exit 1
    fi
    echo "==> Memory limit check passed (app mem_limit=$mem)"
}

wait_for_health() {
    local deadline=$((SECONDS + HEALTH_TIMEOUT))
    local status

    while ((SECONDS < deadline)); do
        status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
            "$CONTAINER" 2>/dev/null || echo "missing")"

        case "$status" in
            healthy) return 0 ;;
            unhealthy)
                echo "Container reported unhealthy." >&2
                return 1
                ;;
            missing | none) ;; # not up yet
        esac

        sleep 5
    done

    echo "Timed out after ${HEALTH_TIMEOUT}s waiting for '$CONTAINER' to become healthy." >&2
    return 1
}

# What to fall back to. Before the first CI deploy there is no .image file, so
# the fallback is the locally built image the droplet is already running.
PREVIOUS_IMAGE="$FALLBACK_IMAGE"
if [[ -f .image ]]; then
    PREVIOUS_IMAGE="$(cat .image)"
fi

echo "==> Deploying $IMAGE"
echo "==> Rollback target if this fails: $PREVIOUS_IMAGE"

export APP_IMAGE="$IMAGE"
assert_limits

# Plain `docker pull`, not `compose pull`: the app service still declares a
# build: section, and we never want a build attempted on this 1 vCPU box.
if [[ "$IMAGE" == *"/"* ]]; then
    echo "==> Pulling image"
    docker pull "$IMAGE"
else
    echo "==> Using local image $IMAGE (no registry path, skipping pull)"
fi

if [[ "$DRY_RUN" == "true" || "$DRY_RUN" == "1" ]]; then
    echo
    echo "==> DRY RUN - stopping here. Nothing was restarted."
    echo "==> Resolved image:   $(compose config --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["services"]["app"]["image"])')"
    echo "==> Currently running: $(docker inspect "$CONTAINER" --format '{{.Config.Image}}' 2>/dev/null || echo none)"
    echo "==> Container status:  $(docker inspect "$CONTAINER" --format '{{.State.Status}} ({{if .State.Health}}{{.State.Health.Status}}{{else}}no healthcheck{{end}})' 2>/dev/null || echo none)"
    echo
    echo "==> Re-run with dry_run unchecked to deploy for real."
    exit 0
fi

echo "==> Starting stack"
compose up -d --remove-orphans

echo "==> Waiting for health check (timeout ${HEALTH_TIMEOUT}s)"
if wait_for_health; then
    echo "$IMAGE" > .image
    [[ "$PREVIOUS_IMAGE" != "$IMAGE" ]] && echo "$PREVIOUS_IMAGE" > .image.prev

    echo "==> Pruning dangling images"
    docker image prune -f >/dev/null 2>&1 || true

    echo "==> Deploy succeeded: $IMAGE"
    exit 0
fi

echo "==> Deploy FAILED. Recent application logs:" >&2
compose logs --tail 100 app >&2 || true

if [[ "$PREVIOUS_IMAGE" != "$IMAGE" ]]; then
    echo "==> Rolling back to $PREVIOUS_IMAGE" >&2
    export APP_IMAGE="$PREVIOUS_IMAGE"

    if compose up -d --remove-orphans && wait_for_health; then
        echo "==> Rollback succeeded. Production is serving $PREVIOUS_IMAGE." >&2
    else
        echo "==> ROLLBACK FAILED. Production needs manual attention." >&2
    fi
else
    echo "==> No different image to roll back to." >&2
fi

exit 1
