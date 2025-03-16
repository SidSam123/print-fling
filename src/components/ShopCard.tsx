
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, FileText, MapPin, ExternalLink } from 'lucide-react';

interface ShopCardProps {
  shop: {
    id: string;
    name: string;
    address: string;
    description?: string;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const ShopCard: React.FC<ShopCardProps> = ({ shop, onEdit, onDelete }) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle>{shop.name}</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <MapPin size={14} />
          {shop.address}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {shop.description || 'No description provided.'}
        </p>
      </CardContent>
      <CardFooter className="border-t px-6 py-4 bg-muted/50 flex justify-between">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit(shop.id)}
          >
            <Edit size={14} className="mr-1" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(shop.id)}
          >
            <Trash2 size={14} className="mr-1" />
            Delete
          </Button>
        </div>
        <Link to={`/shop/${shop.id}`}>
          <Button variant="outline" size="sm">
            <ExternalLink size={14} className="mr-1" />
            Manage
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default ShopCard;
