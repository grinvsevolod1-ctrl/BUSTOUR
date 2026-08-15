import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()

const explorer = readFileSync(join(root, "components/admin/media-explorer.tsx"), "utf8")
assert.match(explorer, /onUploadAccepted=\{handleUploadAccepted\}/, "explorer upserts accepted media immediately")
assert.match(explorer, /search:\s*deferredQuery \|\| undefined/, "explorer sends deferred search to API")
assert.match(explorer, /loadItems\(\{ silent: true \}\)/, "explorer polls silently while processing exists")
assert.match(explorer, /item\.status === "processing"/, "explorer tracks processing items")
assert.match(explorer, /disabled=\{deletingId === file\.id \|\| Boolean\(pendingDelete\) \|\| file\.status === "processing"\}/, "processing delete stays blocked")
assert.match(explorer, /"В очереди"/, "queued label shown")
assert.match(explorer, /"Конвертация"/, "converting label shown")
assert.match(explorer, /"Ошибка обработки"/, "failed label shown")

const uploader = readFileSync(join(root, "components/admin/media-uploader.tsx"), "utf8")
assert.match(uploader, /onUploadAccepted\?\.\(existing\)/, "uploader reports deduped pending item immediately")
assert.match(uploader, /onUploadAccepted\?\.\(\{/, "uploader reports uploaded item before ready wait")
assert.match(uploader, /Можно закрыть страницу или перейти в другой раздел/, "uploader explains persisted processing state")
assert.match(uploader, /return waitForReadyMedia\(item\.id\)/, "non-library flows still wait for ready media")

const service = readFileSync(join(root, "lib/media/service.ts"), "utf8")
assert.match(service, /status:\s*"processing"/, "service creates pending processing records")
assert.match(service, /processingStage:\s*"queued"/, "service starts jobs in queued stage")
assert.match(service, /async function claimNextProcessingMedia/, "service exposes worker claim loop")
assert.match(service, /async function failMediaProcessing/, "service persists failed state")
assert.match(service, /async function completeMediaProcessing/, "service persists ready state")

const route = readFileSync(join(root, "app/api/media/upload/route.ts"), "utf8")
assert.match(route, /mediaService\.saveFile/, "upload route returns persisted media item")

console.log("media-processing-status.selfcheck: ok")
