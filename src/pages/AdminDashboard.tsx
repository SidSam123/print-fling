
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import UserRedirect from '@/components/UserRedirect';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Store, Printer, Settings } from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  
  return (
    <UserRedirect requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Navbar />
        
        <div className="container px-4 md:px-6 pt-28 pb-16 md:pt-36 md:pb-20">
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {user?.name || 'Admin'}
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users size={18} />
                    Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Total registered users</p>
                </CardContent>
              </Card>
              
              <Card className="bg-secondary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Store size={18} />
                    Shops
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Registered print shops</p>
                </CardContent>
              </Card>
              
              <Card className="bg-accent/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Printer size={18} />
                    Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Total print orders</p>
                </CardContent>
              </Card>
              
              <Card className="bg-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Settings size={18} />
                    System
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">Online</div>
                  <p className="text-xs text-muted-foreground">System status</p>
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid grid-cols-4 max-w-md mb-8">
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="shops">Shops</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      View and manage all system users
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Users size={64} className="text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">User management coming soon</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        This section is under development and will be available soon
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="shops">
                <Card>
                  <CardHeader>
                    <CardTitle>Shop Management</CardTitle>
                    <CardDescription>
                      View and manage all registered print shops
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Store size={64} className="text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">Shop management coming soon</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        This section is under development and will be available soon
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Management</CardTitle>
                    <CardDescription>
                      View and manage all print orders in the system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Printer size={64} className="text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">Order management coming soon</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        This section is under development and will be available soon
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>System Settings</CardTitle>
                    <CardDescription>
                      Configure system-wide settings and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Settings size={64} className="text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">System settings coming soon</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        This section is under development and will be available soon
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </UserRedirect>
  );
};

export default AdminDashboard;
