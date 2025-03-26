
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Eye, FileText, Clock, Printer, AlertTriangle, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type PrintJob = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  shop_id: string;
  paper_size: string;
  color_mode: string;
  copies: number;
  double_sided: boolean;
  stapling: boolean;
  price: number;
  file_path: string;
  customer_id: string;
  customer_name?: string;
};

type Shop = {
  id: string;
  name: string;
};

const statusStyles = {
  pending: {
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: Clock,
  },
  processing: {
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: Printer,
  },
  ready: {
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: CheckCircle,
  },
  cancelled: {
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: AlertTriangle,
  },
};

const ShopOrdersTab = () => {
  const { user } = useAuth();
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchShops = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('id, name')
          .eq('owner_id', user.id);
          
        if (error) throw error;
        
        setShops(data || []);
        if (data && data.length > 0) {
          setSelectedShop(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching shops:', error);
        toast.error('Failed to load your shops');
      } finally {
        setLoading(false);
      }
    };
    
    fetchShops();
  }, [user]);

  useEffect(() => {
    if (selectedShop === 'all') {
      fetchAllShopOrders();
    } else {
      fetchShopOrders(selectedShop);
    }
  }, [selectedShop, selectedTab]);

  const fetchAllShopOrders = async () => {
    if (!user || shops.length === 0) return;
    
    try {
      setLoading(true);
      
      const shopIds = shops.map(shop => shop.id);
      
      let query = supabase
        .from('print_jobs')
        .select('*')
        .in('shop_id', shopIds)
        .order('created_at', { ascending: false });
      
      // Filter by status if a specific tab is selected
      if (selectedTab !== 'all') {
        query = query.eq('status', selectedTab);
      }
        
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Fetch customer names
      const customerIds = [...new Set(data.map(job => job.customer_id))];
      
      const { data: customersData, error: customersError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', customerIds);
        
      if (customersError) throw customersError;
      
      const jobsWithCustomerNames = data.map(job => ({
        ...job,
        customer_name: customersData?.find(c => c.id === job.customer_id)?.name || 'Unknown Customer',
        shop_name: shops.find(s => s.id === job.shop_id)?.name
      }));
      
      setPrintJobs(jobsWithCustomerNames);
    } catch (error) {
      console.error('Error fetching print jobs:', error);
      toast.error('Failed to load print jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchShopOrders = async (shopId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('print_jobs')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      
      // Filter by status if a specific tab is selected
      if (selectedTab !== 'all') {
        query = query.eq('status', selectedTab);
      }
        
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Fetch customer names
      const customerIds = [...new Set(data.map(job => job.customer_id))];
      
      const { data: customersData, error: customersError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', customerIds);
        
      if (customersError) throw customersError;
      
      const jobsWithCustomerNames = data.map(job => ({
        ...job,
        customer_name: customersData?.find(c => c.id === job.customer_id)?.name || 'Unknown Customer'
      }));
      
      setPrintJobs(jobsWithCustomerNames);
    } catch (error) {
      console.error('Error fetching print jobs:', error);
      toast.error('Failed to load print jobs');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (jobId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('print_jobs')
        .update({ status: newStatus })
        .eq('id', jobId);
        
      if (error) throw error;
      
      setPrintJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId ? { ...job, status: newStatus } : job
        )
      );
      
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const viewDocument = async (filePath: string) => {
    try {
      setViewingDocument(filePath);
      
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      setDocumentUrl(data.publicUrl);
    } catch (error) {
      console.error('Error getting document URL:', error);
      toast.error('Failed to load the document');
      setViewingDocument(null);
    }
  };

  if (shops.length === 0 && !loading) {
    return (
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Print Orders</CardTitle>
          <CardDescription>
            You need to register a shop before you can receive orders
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          <div className="p-5 bg-muted rounded-full mb-5">
            <FileText size={48} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No shops available</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-2 text-center">
            Register a shop to start receiving print orders from customers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Print Orders</CardTitle>
          <CardDescription>
            View and manage all incoming print job requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shops.length > 0 && (
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Select Shop</label>
              <Select 
                value={selectedShop} 
                onValueChange={setSelectedShop}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a shop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {shops.map(shop => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="ready">Ready</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedTab}>
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="rounded-md h-8 w-8 border-4 border-t-primary border-r-transparent border-l-transparent border-b-transparent animate-spin"></div>
                </div>
              ) : printJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-5 bg-muted rounded-full mb-5">
                    <FileText size={48} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No orders found</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-2">
                    There are no {selectedTab !== 'all' ? selectedTab : ''} print orders for the selected shop at this time.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {printJobs.map((job) => {
                    const status = job.status as keyof typeof statusStyles;
                    const StatusIcon = statusStyles[status]?.icon || Clock;

                    return (
                      <div 
                        key={job.id}
                        className="p-4 border rounded-lg flex flex-col space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3 items-center">
                            <div className={`p-2 rounded-full ${statusStyles[status]?.bgColor || 'bg-gray-100'}`}>
                              <StatusIcon size={18} className={`${statusStyles[status]?.textColor || 'text-gray-800'}`} />
                            </div>
                            <div>
                              <h4 className="font-medium">{job.customer_name}</h4>
                              <div className="flex items-center gap-2">
                                {selectedShop === 'all' && (
                                  <span className="text-xs bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
                                    {job.shop_name}
                                  </span>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`${statusStyles[status]?.textColor || ''} ${statusStyles[status]?.bgColor || ''}`}
                          >
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Paper:</span> {job.paper_size}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Color:</span> {job.color_mode === 'bw' ? 'B&W' : 'Color'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Copies:</span> {job.copies}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Double-sided:</span> {job.double_sided ? 'Yes' : 'No'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Stapling:</span> {job.stapling ? 'Yes' : 'No'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Price:</span> ${job.price?.toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="pt-2 flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => viewDocument(job.file_path)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Document
                          </Button>
                          
                          {job.status === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-blue-50 text-blue-800 hover:bg-blue-100"
                              onClick={() => updateOrderStatus(job.id, 'processing')}
                            >
                              Start Processing
                            </Button>
                          )}
                          
                          {job.status === 'processing' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-green-50 text-green-800 hover:bg-green-100"
                              onClick={() => updateOrderStatus(job.id, 'ready')}
                            >
                              Mark as Ready
                            </Button>
                          )}
                          
                          {job.status === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-red-50 text-red-800 hover:bg-red-100"
                              onClick={() => updateOrderStatus(job.id, 'cancelled')}
                            >
                              Cancel Order
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {documentUrl && (
              <iframe 
                src={documentUrl} 
                className="w-full h-full min-h-[70vh]" 
                title="Document Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShopOrdersTab;
