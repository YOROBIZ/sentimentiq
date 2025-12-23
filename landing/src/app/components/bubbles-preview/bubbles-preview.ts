import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit, HostListener } from '@angular/core';

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label: string;
}

@Component({
  selector: 'app-bubbles-preview',
  standalone: true,
  template: '<canvas #bubbleCanvas></canvas>',
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    canvas { width: 100%; height: 100%; display: block; }
  `]
})
export class BubblesPreviewComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bubbleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private bubbles: Bubble[] = [];
  private animationId: number = 0;
  private isVisible: boolean = true;

  private readonly COLORS = {
    POSITIVE: '#10b981',
    NEUTRAL: '#64748b',
    NEGATIVE: '#ef4444'
  };

  private readonly LABELS = ['Churn Risk', 'UX Friction', 'Growth Signal', 'User Voice', 'Brand Health', 'CX Insights', 'Intent Mapping', 'Trend Alert'];

  ngAfterViewInit() {
    this.initCanvas();
    this.createBubbles();
    this.animate();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
  }

  @HostListener('window:resize')
  onResize() {
    this.initCanvas();
  }

  private initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    this.ctx = canvas.getContext('2d')!;
  }

  private createBubbles() {
    const count = 8;
    const canvas = this.canvasRef.nativeElement;

    for (let i = 0; i < count; i++) {
      const sentiment = i % 3 === 0 ? 'POSITIVE' : (i % 3 === 1 ? 'NEUTRAL' : 'NEGATIVE');
      const radius = 30 + Math.random() * 20;

      this.bubbles.push({
        x: Math.random() * (canvas.width - radius * 2) + radius,
        y: Math.random() * (canvas.height - radius * 2) + radius,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: radius,
        color: this.COLORS[sentiment],
        label: this.LABELS[i]
      });
    }
  }

  private animate() {
    if (!this.isVisible) return;

    this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);

    this.bubbles.forEach(b => {
      // Update pos
      b.x += b.vx;
      b.y += b.vy;

      // Bounce walls
      if (b.x - b.radius < 0 || b.x + b.radius > this.canvasRef.nativeElement.width) b.vx *= -1;
      if (b.y - b.radius < 0 || b.y + b.radius > this.canvasRef.nativeElement.height) b.vy *= -1;

      // Draw shadow
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = 'rgba(0,0,0,0.05)';
      this.ctx.shadowOffsetY = 5;

      // Draw bubble
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.fill();

      // Draw border
      this.ctx.globalAlpha = 0.5;
      this.ctx.strokeStyle = b.color;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
      this.ctx.globalAlpha = 1.0;

      // Reset shadow
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetY = 0;

      // Draw label
      this.ctx.fillStyle = '#1e293b';
      this.ctx.font = '500 12px Inter';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(b.label, b.x, b.y);
    });

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    this.isVisible = !document.hidden;
    if (this.isVisible) this.animate();
  }
}
