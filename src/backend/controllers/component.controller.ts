import { Request, Response } from 'express';

export class ComponentController {
  private componentCache: Map<string, string> = new Map();

  storeComponent(hash: string, javascript: string): void {
    console.log(`[ComponentController] Storing component with hash: ${hash}, size: ${javascript.length} bytes`);
    this.componentCache.set(hash, javascript);
    
    setTimeout(() => {
      console.log(`[ComponentController] Expiring component with hash: ${hash}`);
      this.componentCache.delete(hash);
    }, 60 * 60 * 1000);
  }

  async getComponent(req: Request, res: Response): Promise<void> {
    try {
      const { hash } = req.params;
      
      if (!hash) {
        res.status(400).json({ error: 'Hash parameter is required' });
        return;
      }

      const javascript = this.componentCache.get(hash);
      
      if (!javascript) {
        res.status(404).json({ error: 'Component not found or expired' });
        return;
      }

      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.send(javascript);
    } catch (error: any) {
      console.error('Error serving component:', error);
      res.status(500).json({ error: 'Failed to serve component' });
    }
  }
}

export const componentController = new ComponentController();
