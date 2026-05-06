import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideNativeDateAdapter } from "@angular/material/core";
import { provideFormlyCore } from "@ngx-formly/core";
import { withFormlyMaterial } from "@ngx-formly/material";

import { routes } from "./app.routes";
import {
  RepeatFieldType,
  UnionFieldType,
  DatepickerFieldType,
  NumberRangeFieldType,
  IriFieldType,
} from "./shared/formly-types";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    provideFormlyCore([
      ...withFormlyMaterial(),
      {
        types: [
          { name: "repeat", component: RepeatFieldType, wrappers: [] },
          { name: "union-field", component: UnionFieldType, wrappers: [] },
          { name: "datepicker", component: DatepickerFieldType, wrappers: [] },
          { name: "number", component: NumberRangeFieldType, wrappers: [] },
          { name: "iri", component: IriFieldType, wrappers: [] },
        ],
        validationMessages: [
          { name: "required", message: "This field is required" },
          { name: "min", message: (err) => `Minimum value is ${err["min"]}` },
          { name: "max", message: (err) => `Maximum value is ${err["max"]}` },
          { name: "pattern", message: "Invalid format" },
        ],
      },
    ]),
  ],
};
