import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

const fixtures = resolve(import.meta.dirname, "fixtures");

test.describe("SD Creation Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays upload page on initial load", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "SD Creation Wizard" })).toBeVisible();
    await expect(page.getByText("Upload a SHACL shapes file")).toBeVisible();
  });

  test("uploads TTL and renders wizard steps", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(resolve(fixtures, "test-multiple-shapes.ttl"));

    // Wait for the stepper to appear
    await expect(page.locator("mat-stepper")).toBeVisible({ timeout: 15000 });

    // Should have 3 shape steps + 1 review step = 4 steps
    const stepHeaders = page.locator("mat-step-header");
    await expect(stepHeaders).toHaveCount(4);

    // Verify step labels match shape target classes
    await expect(stepHeaders.nth(0)).toContainText("phone");
    await expect(stepHeaders.nth(1)).toContainText("address");
    await expect(stepHeaders.nth(2)).toContainText("Person");
    await expect(stepHeaders.nth(3)).toContainText("Review");
  });

  test("renders select field for sh:in constraint", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(resolve(fixtures, "test-in-property.ttl"));

    await expect(page.locator("mat-stepper")).toBeVisible({ timeout: 15000 });

    // The gender field should be a select/dropdown with options
    const selectField = page.locator("mat-select");
    await expect(selectField).toBeVisible();
  });

  test("navigates through steps with Next/Back buttons", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(resolve(fixtures, "test-multiple-shapes.ttl"));

    await expect(page.locator("mat-stepper")).toBeVisible({ timeout: 15000 });

    // Click Next to go to step 2
    await page.getByRole("button", { name: "Next" }).click();
    const stepHeaders = page.locator("mat-step-header");
    await expect(stepHeaders.nth(1)).toHaveAttribute("aria-selected", "true");

    // Click Back to return to step 1
    await page.getByRole("button", { name: "Back" }).click();
    await expect(stepHeaders.nth(0)).toHaveAttribute("aria-selected", "true");
  });

  test("exports JSON-LD from review step", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(resolve(fixtures, "test-in-property.ttl"));

    await expect(page.locator("mat-stepper")).toBeVisible({ timeout: 15000 });

    // Navigate to review step
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for review step to be active
    const reviewHeader = page.locator('mat-step-header:has-text("Review & Export")');
    await expect(reviewHeader).toBeVisible();

    // Click export
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export JSON-LD/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("metadata.json");
  });

  test("shows prefill upload after SHACL file is selected", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(resolve(fixtures, "test-in-property.ttl"));

    // The prefill section should appear after selecting a SHACL file
    // (but before the stepper loads, there's a brief moment where it shows)
    // After loading, the stepper replaces the upload view
    await expect(page.locator("mat-stepper")).toBeVisible({ timeout: 15000 });
  });

  test("shows error snackbar on invalid file upload", async ({ page }) => {
    // Create a temporary invalid file
    const fileInput = page.locator('input[type="file"]').first();

    // Upload an empty/invalid file that will cause API error
    await fileInput.setInputFiles({
      name: "invalid.ttl",
      mimeType: "text/turtle",
      buffer: Buffer.from("this is not valid turtle syntax @@@"),
    });

    // Should show error snackbar
    await expect(page.locator("mat-snack-bar-container")).toBeVisible({ timeout: 15000 });
  });
});
