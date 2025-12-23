import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header';
import { HeroComponent } from '../../components/hero/hero';
import { FeaturesComponent } from '../../components/features/features';
import { HowItWorksComponent } from '../../components/how-it-works/how-it-works';
import { TechBoxComponent } from '../../components/tech-box/tech-box';
import { FooterComponent } from '../../components/footer/footer';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    HeroComponent,
    FeaturesComponent,
    HowItWorksComponent,
    TechBoxComponent,
    FooterComponent
  ],
  template: `
    <app-header></app-header>
    <main>
      <app-hero></app-hero>
      <app-features></app-features>
      <app-how-it-works></app-how-it-works>
      <app-tech-box></app-tech-box>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`
    main {
      overflow: hidden;
    }
  `]
})
export class LandingComponent { }
