import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideNativeDateAdapter } from "@angular/material/core";
import { provideFormlyCore } from "@ngx-formly/core";

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
    provideFormlyCore({
      types: [
        { name: "repeat", component: RepeatFieldType },
        { name: "union-field", component: UnionFieldType },
        { name: "datepicker", component: DatepickerFieldType },
        { name: "number", component: NumberRangeFieldType },
        { name: "iri", component: IriFieldType },
      ],
      validationMessages: [
        { name: "required", message: "This field is required" },
        { name: "min", message: (err) => `Minimum value is ${err["min"]}` },
        { name: "max", message: (err) => `Maximum value is ${err["max"]}` },
        { name: "pattern", message: "Invalid format" },
      ],
    }),
  ],
};
