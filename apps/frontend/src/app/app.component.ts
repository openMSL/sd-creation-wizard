import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, MatToolbarModule],
  template: `
    <mat-toolbar color="primary">
      <span>SD Creation Wizard</span>
    </mat-toolbar>
    <main>
      <router-outlet />
    </main>
  `,
  styles: [
    `
      main {
        padding: 24px;
        max-width: 960px;
        margin: 0 auto;
      }
    `,
  ],
})
export class AppComponent {}
