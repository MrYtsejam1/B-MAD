import { Injectable } from '@angular/core';

export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private metrics: PerformanceMetrics | null = null;

  /**
   * Collect performance metrics
   */
  collectMetrics(): PerformanceMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
    const lcp = this.getLargestContentfulPaint();

    this.metrics = {
      loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      firstContentfulPaint: fcp ? fcp.startTime : 0,
      largestContentfulPaint: lcp,
      timeToInteractive: this.getTimeToInteractive(),
      totalBlockingTime: this.getTotalBlockingTime(),
    };

    return this.metrics;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  /**
   * Log performance metrics to console
   */
  logMetrics(): void {
    const metrics = this.collectMetrics();
    console.group('Performance Metrics');
    console.log(`Load Time: ${metrics.loadTime.toFixed(2)}ms`);
    console.log(`First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms`);
    console.log(`Largest Contentful Paint: ${metrics.largestContentfulPaint.toFixed(2)}ms`);
    console.log(`Time to Interactive: ${metrics.timeToInteractive.toFixed(2)}ms`);
    console.log(`Total Blocking Time: ${metrics.totalBlockingTime.toFixed(2)}ms`);
    console.groupEnd();
  }

  /**
   * Lazy load images
   */
  lazyLoadImages(container?: HTMLElement): void {
    const images = (container || document).querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.getAttribute('data-src');
          
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  /**
   * Debounce function calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        func(...args);
      }, wait);
    };
  }

  /**
   * Throttle function calls
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Optimize bundle size by code splitting
   */
  async loadModule(modulePath: string): Promise<any> {
    try {
      const module = await import(/* webpackChunkName: "[request]" */ modulePath);
      return module;
    } catch (error) {
      console.error(`Failed to load module: ${modulePath}`, error);
      throw error;
    }
  }

  /**
   * Cache API responses
   */
  cacheResponse(key: string, data: any, ttl: number = 300000): void {
    const item = {
      data,
      expiry: Date.now() + ttl,
    };
    
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to cache response:', error);
    }
  }

  /**
   * Get cached response
   */
  getCachedResponse(key: string): any | null {
    try {
      const itemStr = localStorage.getItem(`cache_${key}`);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      
      if (Date.now() > item.expiry) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to get cached response:', error);
      return null;
    }
  }

  private getLargestContentfulPaint(): number {
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    return lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;
  }

  private getTimeToInteractive(): number {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return navigation ? navigation.domInteractive - navigation.fetchStart : 0;
  }

  private getTotalBlockingTime(): number {
    const longTasks = performance.getEntriesByType('longtask');
    return longTasks.reduce((total, task) => total + Math.max(0, task.duration - 50), 0);
  }
}
