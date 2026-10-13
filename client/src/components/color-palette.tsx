import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import type { BrickColor } from "@/lib/lego-colors";

export default function ColorPalette() {
  const [selectedColor, setSelectedColor] = useState<BrickColor | null>(null);

  const { data: colors = [], isLoading } = useQuery<BrickColor[]>({
    queryKey: ['/api/lego-colors'],
  });

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-border bg-card/70 shadow-sm backdrop-blur-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Available Colours</h3>
          <div className="animate-pulse">
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-8 h-8 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border bg-card/70 shadow-sm backdrop-blur-sm">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Available Colours</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {colors.length} custom colours in your inventory
        </p>
        
        <div className="grid grid-cols-6 gap-2">
          {colors.slice(0, 18).map((color, index) => (
            <button
              key={index}
              className="w-8 h-8 rounded-lg border border-border cursor-pointer hover:scale-110 transition-transform shadow-sm"
              style={{ backgroundColor: color.hex }}
              title={color.name}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-sm text-primary hover:text-primary/80 font-medium mt-3 p-0 h-auto">
              View All Colours <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>All Colours ({colors.length})</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-8 gap-3 max-h-96 overflow-y-auto">
              {colors.map((color, index) => (
                <div key={index} className="text-center">
                  <div 
                    className="w-10 h-10 rounded-lg border border-border mx-auto mb-1 cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                  <p className="text-xs text-muted-foreground truncate">{color.name}</p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {selectedColor && (
          <div className="mt-4 p-3 bg-muted/50 rounded-xl border border-border">
            <div className="flex items-center space-x-3">
              <div 
                className="w-6 h-6 rounded-md border border-border"
                style={{ backgroundColor: selectedColor.hex }}
              />
              <div>
                <p className="text-sm font-medium text-foreground">{selectedColor.name}</p>
                <p className="text-xs text-muted-foreground">{selectedColor.hex}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
