
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import UserRedirect from '@/components/UserRedirect';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Printer, Settings, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ShopFormModal from '@/components/ShopFormModal';
import ShopCard from '@/components/ShopCard';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ShopkeeperDashboard = () => {
  const { user } = useAuth();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopFormOpen, setShopFormOpen] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<string | null>(null);
  
  // Fetch shops owned by the current user
  const fetchShops = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching shops:', error);
        toast.error('Failed to load your shops');
        return;
      }
      
      setShops(data || []);
    } catch (error) {
      console.error('Error in fetchShops:', error);
      toast.error('Something went wrong while loading your shops');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchShops();
  }, [user]);
  
  const handleEditShop = (shopId: string) => {
    setSelectedShopId(shopId);
    setShopFormOpen(true);
  };
  
  const handleAddNewShop = () => {
    setSelectedShopId(undefined);
    setShopFormOpen(true);
  };
  
  const confirmDeleteShop = (shopId: string) => {
    setShopToDelete(shopId);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteShop = async () => {
    if (!shopToDelete) return;
    
    try {
      const { error } = await supabase
        .from('shops')
        .delete()
        .eq('id', shopToDelete);
        
      if (error) {
        throw error;
      }
      
      toast.success('Shop deleted successfully');
      fetchShops();
    } catch (error: any) {
      console.error('Error deleting shop:', error);
      toast.error(error.message || 'Failed to delete shop');
    } finally {
      setDeleteDialogOpen(false);
      setShopToDelete(null);
    }
  };
  
  return (
    <UserRedirect requiredRole="shopkeeper">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Navbar />
        
        <div className="container px-4 md:px-6 pt-28 pb-16 md:pt-36 md:pb-20">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">Print Shop Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Welcome back, {user?.name || 'Shop Owner'}
                </p>
              </div>
              
              <Button className="flex items-center gap-2" onClick={handleAddNewShop}>
                <Plus size={16} />
                Register New Shop
              </Button>
            </div>
            
            <Tabs defaultValue="shops" className="w-full">
              <TabsList className="grid grid-cols-3 max-w-md mb-8">
                <TabsTrigger value="shops">My Shops</TabsTrigger>
                <TabsTrigger value="orders">Print Orders</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="shops" className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="rounded-md h-8 w-8 border-4 border-t-primary border-r-transparent border-l-transparent border-b-transparent animate-spin"></div>
                  </div>
                ) : shops.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {shops.map((shop) => (
                      <ShopCard 
                        key={shop.id} 
                        shop={shop}
                        onEdit={handleEditShop}
                        onDelete={confirmDeleteShop}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle>No shops registered</CardTitle>
                      <CardDescription>
                        Register your first print shop to start accepting orders
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-8">
                      <Printer size={64} className="text-muted-foreground mb-4" />
                      <Button 
                        className="flex items-center gap-2"
                        onClick={handleAddNewShop}
                      >
                        <Plus size={16} />
                        Register New Shop
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>Print Orders</CardTitle>
                    <CardDescription>
                      View and manage all incoming print job requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FileText size={64} className="text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No orders yet</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        Orders will appear here once customers place them for your shop
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>
                      Manage your account preferences and profile
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Settings size={64} className="text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">Account settings</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        Account settings will be available here soon
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* Shop Form Modal */}
      <ShopFormModal
        open={shopFormOpen}
        onOpenChange={setShopFormOpen}
        shopId={selectedShopId}
        onSuccess={fetchShops}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shop?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this shop and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteShop}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UserRedirect>
  );
};

export default ShopkeeperDashboard;
