
import React, { useState, useEffect } from 'react';
import { 
  Calendar, FileText, Clock, Printer, AlertTriangle, CheckCircle, 
  User, X, Eye, LucideIndianRupee, Mail 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type PrintJobRow = Database['public']['Tables']['print_jobs']['Row'];

interface DatabasePrintJob extends PrintJobRow {}

interface User {
  id: string;
  email: string;
}

interface PrintJob extends DatabasePrintJob {
  customer_name: string;
  customer_email: string;
}

interface PrintJobWithProfile extends DatabasePrintJob {
  profiles: Profile | null;
}

type PrintJobResponse = Omit<PrintJob, 'customer_name' | 'customer_email'> & {
  profiles: Profile | null;
};

interface ShopOrdersTabProps {
  shopId?: string;
  onOrderCompleted?: () => void;
}

const statusStyles = {
  pending: {
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: Clock,
  },
  completed: {
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

const ShopOrdersTab = ({ shopId, onOrderCompleted }: ShopOrdersTabProps) => {
  const { user } = useAuth();
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchPrintJobs = async (currentShopId: string, force: boolean = false) => {
    if (!user || !currentShopId) return;

    const now = Date.now();
    if (!force && now - lastFetchTime < 5000) {
      return;
    }

    try {
      setLoading(true);
      
      // First, get all print jobs for this shop
      const { data: jobsData, error: jobsError } = await supabase
        .from('print_jobs')
        .select('*')
        .eq('shop_id', currentShopId)
        .order('created_at', { ascending: false });
      
      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        setError('Failed to load orders');
        return;
      }

      if (!jobsData || jobsData.length === 0) {
        setPrintJobs([]);
        setError(null);
        setLastFetchTime(now);
        return;
      }

      // Now, fetch all customer profiles for these jobs in a single query
      const customerIds = jobsData.map(job => job.customer_id);
      const { data: customerProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', customerIds);

      if (profilesError) {
        console.error('Error fetching customer profiles:', profilesError);
      }

      // Map customer data to jobs
      const jobsWithCustomerDetails = jobsData.map((job: any) => {
        // Find the matching customer profile
        const customerProfile = customerProfiles?.find(profile => profile.id === job.customer_id) || null;
        
        const customerName = customerProfile?.name || 'Unknown Customer';
        // Use null coalescing to handle null values - only show "Unknown Email" if truly null or undefined
        const customerEmail = customerProfile?.email ?? 'Unknown Email';

        return {
          ...job,
          customer_name: customerName,
          customer_email: customerEmail
        } as PrintJob;
      });

      setPrintJobs(jobsWithCustomerDetails);
      setError(null);
      setLastFetchTime(now);
    } catch (error: any) {
      console.error('Error fetching print jobs:', error);
      setError('An unexpected error occurred');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchUserShops = async (force: boolean = false) => {
    if (!user) return;

    const now = Date.now();
    if (!force && now - lastFetchTime < 5000) {
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id);
        
      if (error) {
        console.error('Error fetching shops:', error);
        setError('Failed to load shops');
        return;
      }
      
      if (data && data.length > 0) {
        setShops(data);
        if (!selectedShopId) {
          setSelectedShopId(shopId || data[0].id);
        }
        setError(null);
        setLastFetchTime(now);
      }
    } catch (error) {
      console.error('Error in fetchUserShops:', error);
      setError('Failed to load shops');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const loadShops = async (force: boolean = false) => {
      if (!mounted) return;
      
      try {
        await fetchUserShops(force);
      } catch (error) {
        console.error('Error in loadShops:', error);
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          retryTimeout = setTimeout(() => loadShops(true), 1000 * retryCount);
        }
      }
    };

    loadShops(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted) {
        retryCount = 0;
        loadShops(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, shopId]);

  useEffect(() => {
    let mounted = true;
    let channel: any;
    let retryTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const loadJobs = async (force: boolean = false) => {
      if (!mounted || !selectedShopId) return;
      
      try {
        await fetchPrintJobs(selectedShopId, force);
      } catch (error) {
        console.error('Error in loadJobs:', error);
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          retryTimeout = setTimeout(() => loadJobs(true), 1000 * retryCount);
        }
      }
    };

    const setupSubscription = (currentShopId: string) => {
      channel = supabase
        .channel(`shop_orders_${currentShopId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'print_jobs',
            filter: `shop_id=eq.${currentShopId}`
          }, 
          () => {
            if (mounted) {
              loadJobs(true);
            }
          }
        )
        .subscribe();
    };

    if (selectedShopId) {
      loadJobs(true);
      setupSubscription(selectedShopId);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted && selectedShopId) {
        retryCount = 0;
        loadJobs(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedShopId, user]);

  const markJobAsCompleted = async (jobId: string) => {
    try {
      // First update the job status in the database
      const { error } = await supabase
        .from('print_jobs')
        .update({ status: 'completed' })
        .eq('id', jobId);

      if (error) throw error;

      // Update local state to reflect the change
      setPrintJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId 
            ? { ...job, status: 'completed' } 
            : job
        )
      );

      // Then call the edge function to send the email notification
      toast.info('Sending completion notification to customer...');
      
      try {
        const { data, error: emailError } = await supabase.functions.invoke('send-order-complete-email', {
          body: { orderId: jobId }
        });

        if (emailError) {
          console.error('Error sending email notification:', emailError);
          toast.error('Order marked as completed, but email notification failed');
        } else {
          toast.success('Order marked as completed and customer notified');
        }
      } catch (emailError: any) {
        console.error('Exception in email notification:', emailError);
        toast.error('Order marked as completed, but email notification failed');
      }

      if (onOrderCompleted) {
        onOrderCompleted();
      }
    } catch (error: any) {
      console.error('Error completing order:', error);
      toast.error(error.message || 'Failed to complete order');
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

  const filteredJobs = printJobs.filter(job => {
    if (activeTab === 'all') return true;
    return job.status === activeTab;
  });

  if (loading) {
    return (
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Print Orders</CardTitle>
          <CardDescription>
            Manage customer print jobs
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <div className="h-6 w-6 border-2 border-t-primary border-r-transparent border-l-transparent border-b-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-muted-foreground">Loading orders...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Print Orders</CardTitle>
          <CardDescription>
            Manage customer print jobs
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          <div className="p-5 bg-red-100 rounded-full mb-5">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-red-500">Error Loading Orders</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-2 text-center">
            {error}. Please try refreshing the page.
          </p>
          <Button 
            className="mt-6" 
            onClick={() => {
              setError(null);
              setLoading(true);
              if (selectedShopId) {
                fetchPrintJobs(selectedShopId).finally(() => setLoading(false));
              }
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!selectedShopId && shops.length > 0) {
    return (
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Select Shop</CardTitle>
          <CardDescription>
            Choose a shop to view print orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {shops.map(shop => (
              <Button 
                key={shop.id} 
                variant="outline" 
                className="justify-start h-auto p-4 text-left" 
                onClick={() => setSelectedShopId(shop.id)}
              >
                <div>
                  <h3 className="font-medium">{shop.name}</h3>
                  <p className="text-sm text-muted-foreground">{shop.address}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (shops.length === 0) {
    return (
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>No Shops Found</CardTitle>
          <CardDescription>
            Register a shop to manage print orders
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          <div className="p-5 bg-muted rounded-full mb-5">
            <Printer size={48} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-md mt-2 text-center">
            You don't have any registered shops. Create a shop first to manage print orders.
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
            Manage customer print jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shops.length > 1 && (
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Select Shop</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={selectedShopId || ''}
                onChange={(e) => setSelectedShopId(e.target.value)}
              >
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>
          )}
          
          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-2">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex flex-col items-center py-8">
                  <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <div className="h-6 w-6 border-2 border-t-primary border-r-transparent border-l-transparent border-b-transparent animate-spin"></div>
                  </div>
                  <p className="text-sm text-muted-foreground">Loading orders...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center py-8">
                  <div className="p-5 bg-red-100 rounded-full mb-5">
                    <AlertTriangle size={48} className="text-red-500" />
                  </div>
                  <h3 className="text-lg font-medium text-red-500">Error Loading Orders</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-2 text-center">
                    {error}. Please try refreshing the page.
                  </p>
                  <Button 
                    className="mt-6" 
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                      if (selectedShopId) {
                        fetchPrintJobs(selectedShopId).finally(() => setLoading(false));
                      }
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <div className="p-5 bg-muted rounded-full mb-5">
                    <FileText size={48} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No {activeTab} orders</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-2 text-center">
                    {activeTab === 'pending' 
                      ? "You don't have any pending print orders."
                      : activeTab === 'completed'
                      ? "You don't have any completed print orders."
                      : "You don't have any print orders yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredJobs.map((job) => {
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
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium">Order #{job.id.substring(0, 8)}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={`${statusStyles[status]?.textColor || ''} ${statusStyles[status]?.bgColor || ''}`}
                                >
                                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <LucideIndianRupee className="h-4 w-4" />
                              Rs. {job.price?.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">
                              <span className="text-muted-foreground">Customer:</span> {job.customer_name}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">
                              <span className="text-muted-foreground">Email:</span> {job.customer_email === 'Unknown Email' ? 
                                <span className="text-amber-500">Not provided</span> : 
                                job.customer_email}
                            </p>
                          </div>
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
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => markJobAsCompleted(job.id)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Completed
                              </Button>
                            </>
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
