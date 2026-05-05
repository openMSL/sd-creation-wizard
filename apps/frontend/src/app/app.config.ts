import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideFormlyCore } from "@ngx-formly/core";

import { routes } from "./app.routes";
import { RepeatFieldType } from "./shared/formly-types/repeat-field.type";
import { UnionFieldType } from "./shared/formly-types/union-field.type";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
    provideFormlyCore({
      types: [
        { name: "repeat", component: RepeatFieldType },
        { name: "union-field", component: UnionFieldType },
      ],
      validationMessages: [{ name: "required", message: "This field is required" }],
    }),
  ],
};
