import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import BranchSelector from '@/components/dashboard/BranchSelector';
import DailySalesForm from '@/components/forms/DailySalesForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function DailySales() {
  const { t, i18n } = useTranslation();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('history');
  const { user } = useAuth();
  
  // Determine if user can create sales entries
  const canCreateSales = user?.role === 'cashier' || user?.role === 'admin' || user?.role === 'branch_manager';
  
  // Automatically select the user's branch if they are a cashier
  useEffect(() => {
    if (user?.role === 'cashier' && user?.branchId) {
      setSelectedBranchId(user.branchId);
    }
  }, [user]);
  
  // Fetch daily sales for the selected branch
  const { 
    data: salesData = [], 
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['/api/daily-sales', { branchId: selectedBranchId }],
    queryFn: async () => {
      // إذا لم يتم اختيار فرع بعد، نُعيد مصفوفة فارغة
      if (selectedBranchId === null) return [];
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // إضافة معلمة branchId=0 للدلالة على "كل الفروع"
      console.log('Adding branch filter to request:', selectedBranchId);
      const res = await fetch(`/api/daily-sales?branchId=${selectedBranchId}&date=${today}`);
      
      if (!res.ok) throw new Error('Failed to fetch daily sales');
      
      const data = await res.json();
      console.log('Received daily sales data:', data.length, 'records');
      return data;
    },
    // تمكين الاستعلام حتى عندما يكون selectedBranchId = 0 (كل الفروع)
    enabled: selectedBranchId !== null
  });
  
  // Format date - always use English locale to ensure English numerals and Gregorian calendar
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP', {
      locale: enUS // Force English locale
    });
  };
  
  // Format time - always use English locale to ensure English numerals
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'p', {
      locale: enUS // Force English locale
    });
  };
  
  // Format currency with English numerals
  const formatCurrency = (value: number) => {
    // Force English locale for currency formatting to ensure English numerals
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success bg-opacity-10 text-success">تمت الموافقة</Badge>;
      case 'rejected':
        return <Badge className="bg-danger bg-opacity-10 text-danger">مرفوض</Badge>;
      default:
        return <Badge className="bg-warning bg-opacity-10 text-warning">قيد الانتظار</Badge>;
    }
  };
  
  const handleRefresh = () => {
    refetch();
  };
  
  const handleFormSuccess = () => {
    refetch();
    setActiveTab('history');
  };

  return (
    <MainLayout title={t('dailySales.title')}>
      <BranchSelector
        selectedBranchId={selectedBranchId}
        onBranchChange={setSelectedBranchId}
        onRefresh={handleRefresh}
      />
      
      {selectedBranchId === null ? (
        <div className="bg-neutral-100 p-8 text-center rounded-lg mb-6">
          <h3 className="text-lg font-medium text-neutral-600">{t('dailySales.selectBranchPrompt')}</h3>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex-1 w-full">
              <Card className="border-0 shadow-sm mb-0 overflow-hidden">
                <TabsList className="w-full grid grid-cols-2 bg-amber-50 p-1 h-auto rounded-xl">
                  <TabsTrigger 
                    value="history" 
                    className={`py-3 px-4 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm ${activeTab === 'history' ? 'text-amber-700' : 'text-amber-600'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {t('dailySales.history')}
                  </TabsTrigger>
                  
                  {canCreateSales && (
                    <TabsTrigger 
                      value="create" 
                      className={`py-3 px-4 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm ${activeTab === 'create' ? 'text-amber-700' : 'text-amber-600'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t('dailySales.create')}
                    </TabsTrigger>
                  )}
                </TabsList>
              </Card>
            </div>
          </div>
          
          <TabsContent value="history" className="mt-0">
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-100 pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <CardTitle className="text-xl font-bold text-amber-800">{t('dailySales.todayEntries')}</CardTitle>
                  {canCreateSales && activeTab === 'history' && salesData.length > 0 && (
                    <Button 
                      onClick={() => setActiveTab('create')} 
                      size="sm" 
                      className="mt-3 sm:mt-0 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t('dailySales.create')}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6">
                    <Skeleton className="h-[400px] w-full" />
                  </div>
                ) : salesData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-amber-50/50">
                          <TableHead className="text-amber-800 font-medium">{t('dailySales.cashier')}</TableHead>
                          <TableHead className="text-amber-800 font-medium">{t('dailySales.shiftTime')}</TableHead>
                          <TableHead className="text-amber-800 font-medium">{t('dailySales.cashSales')}</TableHead>
                          <TableHead className="text-amber-800 font-medium">{t('dailySales.networkSales')}</TableHead>
                          <TableHead className="text-amber-800 font-medium">{t('dailySales.totalSales')}</TableHead>
                          <TableHead className="text-amber-800 font-medium">{t('dailySales.discrepancy')}</TableHead>
                          <TableHead className="text-amber-800 font-medium">{t('dailySales.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesData.map((sale: any) => (
                          <TableRow key={sale.id} className="hover:bg-amber-50/30">
                            <TableCell className="font-medium">{sale.cashierName || t('dailySales.unknown')}</TableCell>
                            <TableCell>
                              {formatTime(sale.shiftStart)} - {sale.shiftEnd ? formatTime(sale.shiftEnd) : t('dailySales.ongoing')}
                            </TableCell>
                            <TableCell>{formatCurrency(sale.totalCashSales)}</TableCell>
                            <TableCell>{formatCurrency(sale.totalNetworkSales || 0)}</TableCell>
                            <TableCell className="font-bold">{formatCurrency(sale.totalSales)}</TableCell>
                            <TableCell className={sale.discrepancy < 0 ? 'text-red-600' : sale.discrepancy > 0 ? 'text-green-600' : ''}>
                              {formatCurrency(sale.discrepancy || 0)}
                            </TableCell>
                            <TableCell>{getStatusBadge(sale.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <div className="bg-amber-50 inline-flex rounded-full p-4 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-amber-800 font-medium mb-2">{t('dailySales.noEntries')}</p>
                    <p className="text-amber-600 text-sm max-w-md mx-auto">{t('dailySales.noEntries')}</p>
                    
                    {canCreateSales && (
                      <Button 
                        onClick={() => setActiveTab('create')} 
                        size="sm" 
                        className="mt-4 bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t('dailySales.create')}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {canCreateSales && (
            <TabsContent value="create" className="mt-0">
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-white border-b border-gray-100 pb-4">
                  <div className="flex flex-col sm:flex-row justify-between items-center">
                    <CardTitle className="text-xl font-bold text-amber-800">{t('dailySales.create')}</CardTitle>
                    {salesData.length > 0 && (
                      <Button 
                        onClick={() => setActiveTab('history')} 
                        variant="outline" 
                        size="sm" 
                        className="mt-3 sm:mt-0 border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('dailySales.history')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <DailySalesForm
                    branchId={selectedBranchId}
                    onSuccess={handleFormSuccess}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </MainLayout>
  );
}
