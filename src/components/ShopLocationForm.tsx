
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import GoogleMapPicker from './GoogleMapPicker';
import ShopForm from './ShopForm';

interface ShopLocationFormProps {
  shopId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Location {
  lat: number;
  lng: number;
}

const ShopLocationForm: React.FC<ShopLocationFormProps> = ({ shopId, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [location, setLocation] = useState<Location | null>(null);
  const [shopData, setShopData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMode, setFormMode] = useState<'map' | 'details'>('map');
  
  useEffect(() => {
    const fetchShop = async () => {
      if (!shopId) return;
      
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .eq('id', shopId)
          .single();
          
        if (error) {
          console.error('Error fetching shop:', error);
          toast.error('Failed to load shop data');
          return;
        }
        
        if (data) {
          setShopData(data);
          if (data.latitude && data.longitude) {
            setLocation({ lat: data.latitude, lng: data.longitude });
          }
        }
      } catch (error) {
        console.error('Error in fetchShop:', error);
        toast.error('Something went wrong while loading shop data');
      }
    };
    
    fetchShop();
  }, [shopId]);
  
  const handleLocationSelect = (newLocation: Location) => {
    setLocation(newLocation);
  };
  
  const handleSubmitLocation = async () => {
    if (!user || !location) return;
    
    setIsSubmitting(true);
    
    try {
      if (shopId) {
        // Update existing shop location
        const { error } = await supabase
          .from('shops')
          .update({
            latitude: location.lat,
            longitude: location.lng,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shopId);
          
        if (error) throw error;
        
        toast.success('Shop location updated successfully');
        if (onSuccess) onSuccess();
      } else {
        // First time setting up a shop, go to details form
        setFormMode('details');
      }
    } catch (error: any) {
      console.error('Error saving shop location:', error);
      toast.error(error.message || 'Failed to save shop location');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleShopFormSuccess = () => {
    toast.success('Shop created successfully with location!');
    if (onSuccess) onSuccess();
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {shopId ? 'Update Shop Location' : 'Register New Shop'}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {formMode === 'map' ? (
          <GoogleMapPicker 
            initialLocation={location || undefined}
            onSelectLocation={handleLocationSelect}
          />
        ) : (
          <ShopForm 
            onSuccess={handleShopFormSuccess}
            onCancel={() => setFormMode('map')}
            initialLocation={location}
          />
        )}
      </CardContent>
      
      {formMode === 'map' && (
        <CardFooter className="flex justify-end gap-2">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          
          <Button 
            onClick={handleSubmitLocation} 
            disabled={!location || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                {shopId ? 'Update Location' : 'Continue to Shop Details'}
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ShopLocationForm;
