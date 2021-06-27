import { OverlayModule } from "@angular/cdk/overlay";
import { NgModule } from '@angular/core';
import { MatCardModule } from "@angular/material/card";
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { AppGlobalOverlay } from './global-overlay/global-overlay.directive';

@NgModule({
  declarations: [
    AppComponent,
    AppGlobalOverlay
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    OverlayModule,
    MatCardModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
