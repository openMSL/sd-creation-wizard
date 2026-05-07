import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

const fixtures = resolve(import.meta.dirname, "fixtures");

test.describe("SD Creation Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays upload page on initial load", async ({ page }) => {
    await expect(page.getByTestId("wizard-heading")).toBeVisible();
    await expect(page.getByText("Upload a SHACL shapes file")).toBeVisible();
  });

  test("uploads TTL and renders wizard steps", async ({ page }) => {
    const fileInput = page.getByTestId("file-input").first();
    await fileInput.setInputFiles(resolve(fixtures, "test-multiple-shapes.ttl"));

    // Wait for the stepper to appear
    await expect(page.getByTestId("step-0")).toBeVisible({ timeout: 15000 });

    // Should have shape steps + 1 review step
    await expect(page.getByTestId("step-0")).toContainText("phone");
    await expect(page.getByTestId("step-1")).toContainText("address");
    await expect(page.getByTestId("step-2")).toContainText("Person");
    await expect(page.getByText("Review & Export")).toBeVisible();
  });

  test("renders select field for sh:in constraint", async ({ page }) => {
    const fileInput = page.getByTestId("file-input").first();
    await fileInput.setInputFiles(resolve(fixtures, "test-in-property.ttl"));

    await expect(page.getByTestId("step-0")).toBeVisible({ timeout: 15000 });

    // The gender field should be a select/dropdown with options
    const selectField = page.locator("select");
    await expect(selectField).toBeVisible();
  });

  test("navigates through steps with Next/Back buttons", async ({ page }) => {
    const fileInput = page.getByTestId("file-input").first();
    await fileInput.setInputFiles(resolve(fixtures, "test-multiple-shapes.ttl"));

    await expect(page.getByTestId("step-0")).toBeVisible({ timeout: 15000 });

    // First step should be active (current)
    await expect(page.getByTestId("step-0")).toHaveAttribute("aria-current", "step");

    // Click Next to go to step 2
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByTestId("step-1")).toHaveAttribute("aria-current", "step");

    // Click Back to return to step 1
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByTestId("step-0")).toHaveAttribute("aria-current", "step");
  });

  test("exports JSON-LD from review step", async ({ page }) => {
    const fileInput = page.getByTestId("file-input").first();
    await fileInput.setInputFiles(resolve(fixtures, "test-in-property.ttl"));

    await expect(page.getByTestId("step-0")).toBeVisible({ timeout: 15000 });

    // Navigate to review step (click Next through all form steps)
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for review step to be visible
    await expect(page.getByText("Review & Export").first()).toBeVisible();

    // Click export
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export JSON-LD/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("metadata.json");
  });

  test("shows error message on invalid file upload", async ({ page }) => {
    const fileInput = page.getByTestId("file-input").first();

    // Upload an invalid file that will cause API error
    await fileInput.setInputFiles({
      name: "invalid.ttl",
      mimeType: "text/turtle",
      buffer: Buffer.from("this is not valid turtle syntax @@@"),
    });

    // Should show error message
    await expect(page.getByTestId("error-message")).toBeVisible({ timeout: 15000 });
  });
});
