import { useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ColorInfo {
  hex: string;
  name: string;
}

interface ColorCategory {
  name: string;
  colors: ColorInfo[];
}

const COLOR_LIBRARY: ColorCategory[] = [
  {
    name: 'Neutrals',
    colors: [
      { hex: '#FFFFFF', name: 'White' },
      { hex: '#FDFBF7', name: 'Cream' },
      { hex: '#F5F5DC', name: 'Beige' },
      { hex: '#E8E4DE', name: 'Oatmeal' },
      { hex: '#D3D3D3', name: 'Light Grey' },
      { hex: '#A9A9A9', name: 'Grey' },
      { hex: '#696969', name: 'Charcoal' },
      { hex: '#2F2F2F', name: 'Dark Grey' },
      { hex: '#1A1A1A', name: 'Black' },
    ],
  },
  {
    name: 'Pastels',
    colors: [
      { hex: '#FFE4E1', name: 'Blush Pink' },
      { hex: '#FFC0CB', name: 'Baby Pink' },
      { hex: '#E6E6FA', name: 'Lavender' },
      { hex: '#B0E0E6', name: 'Powder Blue' },
      { hex: '#98FB98', name: 'Mint Green' },
      { hex: '#FFFACD', name: 'Lemon Chiffon' },
      { hex: '#FFDAB9', name: 'Peach Puff' },
      { hex: '#DDA0DD', name: 'Plum' },
      { hex: '#E0FFFF', name: 'Light Cyan' },
    ],
  },
  {
    name: 'Earth Tones',
    colors: [
      { hex: '#8B4513', name: 'Saddle Brown' },
      { hex: '#A0522D', name: 'Sienna' },
      { hex: '#D2691E', name: 'Chocolate' },
      { hex: '#CD853F', name: 'Peru' },
      { hex: '#DEB887', name: 'Burlywood' },
      { hex: '#BC8F8F', name: 'Rosy Brown' },
      { hex: '#556B2F', name: 'Olive Drab' },
      { hex: '#6B8E23', name: 'Olive Green' },
      { hex: '#8FBC8F', name: 'Dark Sea Green' },
    ],
  },
  {
    name: 'Brights',
    colors: [
      { hex: '#FF6B6B', name: 'Coral Red' },
      { hex: '#FF8C42', name: 'Tangerine' },
      { hex: '#FFD93D', name: 'Sunshine' },
      { hex: '#6BCB77', name: 'Kelly Green' },
      { hex: '#4D96FF', name: 'Royal Blue' },
      { hex: '#9B59B6', name: 'Amethyst' },
      { hex: '#E91E63', name: 'Fuchsia' },
      { hex: '#00BCD4', name: 'Teal' },
      { hex: '#FF5722', name: 'Deep Orange' },
    ],
  },
  {
    name: 'Jewel Tones',
    colors: [
      { hex: '#1E3A5F', name: 'Navy' },
      { hex: '#2E5A4C', name: 'Forest' },
      { hex: '#722F37', name: 'Wine' },
      { hex: '#4B2D73', name: 'Amethyst' },
      { hex: '#B8860B', name: 'Goldenrod' },
      { hex: '#008080', name: 'Teal' },
      { hex: '#C71585', name: 'Magenta' },
      { hex: '#191970', name: 'Midnight Blue' },
      { hex: '#800020', name: 'Burgundy' },
    ],
  },
];

interface ColorLibraryProps {
  onColorSelect: (color: string) => void;
  selectedColor?: string;
  className?: string;
}

export function ColorLibrary({ onColorSelect, selectedColor, className }: ColorLibraryProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Neutrals', 'Pastels']);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-primary" />
        <h3 className="font-medium">Color Library</h3>
      </div>

      <div className="space-y-2">
        {COLOR_LIBRARY.map((category) => {
          const isExpanded = expandedCategories.includes(category.name);
          
          return (
            <div key={category.name} className="frosted-panel overflow-hidden">
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-medium">{category.name}</span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 pb-3"
                >
                  <div className="grid grid-cols-5 gap-2">
                    {category.colors.map((color) => {
                      const isSelected = selectedColor?.toUpperCase() === color.hex.toUpperCase();
                      
                      return (
                        <button
                          key={color.hex}
                          onClick={() => onColorSelect(color.hex)}
                          className={cn(
                            'relative w-full aspect-square rounded-lg shadow-sm transition-all hover:scale-110 hover:shadow-md',
                            isSelected && 'ring-2 ring-primary ring-offset-2'
                          )}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check 
                                className={cn(
                                  'w-4 h-4',
                                  isLightColor(color.hex) ? 'text-foreground' : 'text-background'
                                )} 
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to determine if a color is light (for contrast)
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

// Export the library for use elsewhere
export { COLOR_LIBRARY };
export type { ColorCategory, ColorInfo };