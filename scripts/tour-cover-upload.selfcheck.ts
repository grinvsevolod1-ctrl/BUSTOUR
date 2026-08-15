/**
 * Tour cover: MediaUploader → input[name=image] wiring (#41).
 * Run: npx tsx scripts/tour-cover-upload.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

function main() {
  const cover = fs.readFileSync(
    path.join(root, "components/admin/tour-cover-builder.tsx"),
    "utf8",
  )
  assert.ok(cover.includes('name="image"'), "hidden/required cover field")
  assert.ok(cover.includes("Обложка тура"), "cover label")
  assert.ok(cover.includes("onChange={setFile}"), "uploader updates local file state")
  assert.ok(cover.includes("serializeMediaNode"), "serializes node into form value")

  const form = fs.readFileSync(path.join(root, "components/admin/tour-form.tsx"), "utf8")
  assert.ok(form.includes("<TourCoverBuilder"), "tour form mounts cover builder")
  assert.ok(form.includes("required"), "cover required on create/edit")

  const uploader = fs.readFileSync(
    path.join(root, "components/admin/media-uploader.tsx"),
    "utf8",
  )
  assert.ok(uploader.includes("lookupByChecksum"), "checksum before upload")
  assert.ok(uploader.includes("props.onChange"), "onChange fills parent form field")
  assert.ok(!uploader.includes("askReuseDuplicate"), "dup must not block form fill")

  const e2e = fs.readFileSync(path.join(root, "e2e/tours-crud.spec.ts"), "utf8")
  assert.ok(e2e.includes('input[name="image"]'), "e2e asserts cover value")
  assert.ok(e2e.includes("setInputFiles"), "e2e picks cover file")

  console.log("tour-cover-upload.selfcheck: ok")
}

main()
