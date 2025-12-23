import { Component } from '@angular/core';
import { BubblesPreviewComponent } from '../bubbles-preview/bubbles-preview';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [BubblesPreviewComponent],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class HeroComponent { }
