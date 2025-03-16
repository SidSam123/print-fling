
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import UserRedirect from '@/components/UserRedirect';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ShopFormModal from '@/components/ShopFormModal';
import { ArrowLeft, Edit, MapPin, Phone } from 'lucide-react';
import ShopPricing from '@/components/ShopPricing';

const ShopDetails = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Fetch shop data
  const fetchShop = async () => {
    if (!shopId || !user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .eq('owner_id', user.id)
        .single();
        
      if (error) {
        // If the shop doesn't exist or doesn't belong to the user
        if (error.code === 'PGRST116') {
          toast.error("Shop not found or you don't have permission to access it");
          navigate('/shopkeeper-dashboard');
          return;
        }
        throw error;
      }
      
      setShop(data);
    } catch (error: any) {
      console.error('Error fetching shop details:', error);
      toast.error(error.message || 'Failed to load shop details');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchShop();
  }, [shopId, user]);
  
  const handleEditSuccess = () => {
    setEditModalOpen(false);
    fetchShop();
  };
  
  if (loading) {
    return (
      <UserRedirect requiredRole="shopkeeper">
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <Navbar />
          <div className="container px-4 md:px-6 pt-28 pb-16">
            <div className="flex justify-center items-center h-64">
              <div className="rounded-md h-12 w-12 border-4 border-t-primary border-r-transparent border-l-transparent border-b-transparent animate-spin"></div>
            </div>
          </div>
        </div>
      </UserRedirect>
    );
  }
  
  if (!shop) {
    return (
      <UserRedirect requiredRole="shopkeeper">
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <Navbar />
          <div className="container px-4 md:px-6 pt-28 pb-16">
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <h2 className="text-2xl font-bold">Shop Not Found</h2>
              <p className="text-muted-foreground mt-2">The shop you're looking for doesn't exist or you don't have permission to view it.</p>
              <Button 
                className="mt-4"
                onClick={() => navigate('/shopkeeper-dashboard')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </UserRedirect>
    );
  }
  
  return (
    <UserRedirect requiredRole="shopkeeper">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Navbar />
        
        <div className="container px-4 md:px-6 pt-28 pb-16 md:pt-36 md:pb-20">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/shopkeeper-dashboard')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold">{shop.name}</h1>
                  <div className="flex items-center text-muted-foreground mt-1">
                    <MapPin size={14} className="mr-1" />
                    <span>{shop.address}</span>
                    {shop.phone && (
                      <>
                        <span className="mx-2">•</span>
                        <Phone size={14} className="mr-1" />
                        <span>{shop.phone}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => setEditModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Edit size={16} />
                Edit Shop Details
              </Button>
            </div>
            
            {shop.description && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm">{shop.description}</p>
                </CardContent>
              </Card>
            )}
            
            <Tabs defaultValue="pricing" className="w-full">
              <TabsList className="grid grid-cols-3 max-w-md mb-8">
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pricing">
                <ShopPricing shopId={shop.id} />
              </TabsContent>
              
              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>Print Orders</CardTitle>
                    <CardDescription>
                      Manage incoming print orders for this shop
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-muted-foreground">
                        No active orders at the moment
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="analytics">
                <Card>
                  <CardHeader>
                    <CardTitle>Shop Analytics</CardTitle>
                    <CardDescription>
                      View performance metrics for your shop
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-muted-foreground">
                        Analytics will be available once you start processing orders
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* Edit Shop Modal */}
      <ShopFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        shopId={shop.id}
        onSuccess={handleEditSuccess}
      />
    </UserRedirect>
  );
};

export default ShopDetails;
