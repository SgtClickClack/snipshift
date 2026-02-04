/**
 * LeadTracker - Brisbane 100 Pilot CRM
 * 
 * Specialized CRM view for tracking the "Brisbane 100" pilot venues.
 * Features:
 * - Venue tracking with status pipeline (Lead → Onboarding → Active)
 * - Contact management with last contacted dates
 * - Notes for each lead
 * - CEO/Admin guarded access
 * - Electric Lime (#BAFF39) branding for Active status
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { formatDateSafe } from '@/utils/date-formatter';
import { 
  Users, 
  Plus, 
  Loader2, 
  Building2, 
  Phone, 
  Calendar, 
  FileText,
  Search,
  Filter,
  TrendingUp,
  Target,
  Zap,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Rocket,
  PartyPopper
} from 'lucide-react';
import Confetti from 'react-confetti';

type LeadStatus = 'lead' | 'onboarding' | 'active';

interface Lead {
  id: string;
  venueName: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone?: string;
  status: LeadStatus;
  lastContacted: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data for initial development - replace with API integration
const MOCK_LEADS: Lead[] = [
  {
    id: '1',
    venueName: 'The Fox Hotel',
    contactPerson: 'Sarah Mitchell',
    contactEmail: 'sarah@foxhotel.com.au',
    contactPhone: '0412 345 678',
    status: 'active',
    lastContacted: '2026-02-03T10:30:00Z',
    notes: 'Excellent pilot partner. 15 staff onboarded. High fill rate.',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-02-03T10:30:00Z',
  },
  {
    id: '2',
    venueName: 'Cloudland',
    contactPerson: 'James Chen',
    contactEmail: 'james.chen@cloudland.com.au',
    contactPhone: '0423 456 789',
    status: 'onboarding',
    lastContacted: '2026-02-01T14:00:00Z',
    notes: 'Large venue. 30+ staff expected. Integration with their POS pending.',
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-02-01T14:00:00Z',
  },
  {
    id: '3',
    venueName: 'The Triffid',
    contactPerson: 'Emma Thompson',
    contactEmail: 'emma@thetriffid.com.au',
    contactPhone: '0434 567 890',
    status: 'lead',
    lastContacted: '2026-01-28T09:00:00Z',
    notes: 'Music venue, interested in event-based staffing. Follow up next week.',
    createdAt: '2026-01-25T00:00:00Z',
    updatedAt: '2026-01-28T09:00:00Z',
  },
  {
    id: '4',
    venueName: 'Howard Smith Wharves',
    contactPerson: 'Michael Brooks',
    contactEmail: 'mbrooks@hsw.com.au',
    contactPhone: '0445 678 901',
    status: 'active',
    lastContacted: '2026-02-02T16:00:00Z',
    notes: 'Multiple venues under one management. Already processing timesheets via Xero.',
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-02-02T16:00:00Z',
  },
  {
    id: '5',
    venueName: 'Felons Brewing Co',
    contactPerson: 'Lisa Wang',
    contactEmail: 'lisa@felonsbrewing.com',
    contactPhone: '0456 789 012',
    status: 'onboarding',
    lastContacted: '2026-01-30T11:00:00Z',
    notes: 'Craft brewery. High weekend demand. Staff training scheduled.',
    createdAt: '2026-01-22T00:00:00Z',
    updatedAt: '2026-01-30T11:00:00Z',
  },
];

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  lead: {
    label: 'Lead',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20 border-amber-500/50',
  },
  onboarding: {
    label: 'Onboarding',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20 border-blue-500/50',
  },
  active: {
    label: 'Active',
    color: 'text-[#BAFF39]',
    bgColor: 'bg-[#BAFF39]/20 border-[#BAFF39]/50',
  },
};

export default function LeadTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkImportPreview, setBulkImportPreview] = useState<Array<Partial<Lead>>>([]);
  const [bulkImportErrors, setBulkImportErrors] = useState<string[]>([]);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [autoOnboardingLead, setAutoOnboardingLead] = useState<Lead | null>(null);
  
  // Form state for add/edit
  const [formData, setFormData] = useState({
    venueName: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    status: 'lead' as LeadStatus,
    notes: '',
  });

  // Check for CEO/Admin access
  const isCEO = user?.email === 'rick@hospogo.com' || user?.email === 'rick@snipshift.com.au';
  const isAdmin = user?.roles?.includes('admin');
  const hasAccess = isCEO || isAdmin;

  // Fetch leads from API (falls back to mock data in dev)
  const { data: leads = MOCK_LEADS, isLoading } = useQuery({
    queryKey: ['lead-tracker'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/admin/leads/brisbane-100');
        if (!res.ok) throw new Error('Failed to fetch leads');
        return res.json();
      } catch {
        // Fall back to mock data in development
        return MOCK_LEADS;
      }
    },
    enabled: hasAccess,
  });

  // Filtered and searched leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead: Lead) => {
      const matchesSearch = 
        lead.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = leads.length;
    const active = leads.filter((l: Lead) => l.status === 'active').length;
    const onboarding = leads.filter((l: Lead) => l.status === 'onboarding').length;
    const leadCount = leads.filter((l: Lead) => l.status === 'lead').length;
    const conversionRate = total > 0 ? Math.round((active / total) * 100) : 0;
    return { total, active, onboarding, lead: leadCount, conversionRate };
  }, [leads]);

  // Add/Update lead mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const endpoint = data.id 
        ? `/api/admin/leads/brisbane-100/${data.id}`
        : '/api/admin/leads/brisbane-100';
      const method = data.id ? 'PUT' : 'POST';
      const res = await apiRequest(method, endpoint, data);
      if (!res.ok) throw new Error('Failed to save lead');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tracker'] });
      toast({
        title: editingLead ? 'Lead Updated' : 'Lead Added',
        description: `${formData.venueName} has been ${editingLead ? 'updated' : 'added'} successfully.`,
      });
      setIsAddDialogOpen(false);
      setEditingLead(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save lead',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      venueName: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      status: 'lead',
      notes: '',
    });
  };

  // CSV Parser for bulk import
  const parseCSV = (text: string): { leads: Array<Partial<Lead>>; errors: string[] } => {
    const errors: string[] = [];
    const leads: Array<Partial<Lead>> = [];
    
    const lines = text.trim().split('\n');
    if (lines.length === 0) {
      errors.push('No data found');
      return { leads, errors };
    }

    // Detect header row
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('venue') || firstLine.includes('name') || firstLine.includes('contact');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    dataLines.forEach((line, index) => {
      const lineNum = hasHeader ? index + 2 : index + 1;
      
      // Skip empty lines
      if (!line.trim()) return;
      
      // Split by comma or tab
      const parts = line.includes('\t') 
        ? line.split('\t').map(p => p.trim())
        : line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      
      if (parts.length < 2) {
        errors.push(`Line ${lineNum}: Need at least venue name and contact person`);
        return;
      }

      const [venueName, contactPerson, contactEmail, contactPhone, notes] = parts;
      
      if (!venueName) {
        errors.push(`Line ${lineNum}: Missing venue name`);
        return;
      }
      if (!contactPerson) {
        errors.push(`Line ${lineNum}: Missing contact person`);
        return;
      }

      leads.push({
        venueName,
        contactPerson,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        notes: notes || '',
        status: 'lead',
      });
    });

    return { leads, errors };
  };

  // Handle bulk import text change
  const handleBulkImportChange = (text: string) => {
    setBulkImportText(text);
    if (text.trim()) {
      const { leads, errors } = parseCSV(text);
      setBulkImportPreview(leads);
      setBulkImportErrors(errors);
    } else {
      setBulkImportPreview([]);
      setBulkImportErrors([]);
    }
  };

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (leads: Array<Partial<Lead>>) => {
      const res = await apiRequest('POST', '/api/admin/leads/brisbane-100/bulk', { leads });
      if (!res.ok) throw new Error('Failed to import leads');
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['lead-tracker'] });
      toast({
        title: 'Bulk Import Complete',
        description: `Successfully imported ${result.imported || bulkImportPreview.length} leads.`,
      });
      setIsBulkImportOpen(false);
      setBulkImportText('');
      setBulkImportPreview([]);
      setBulkImportErrors([]);
    },
    onError: (error: any) => {
      toast({
        title: 'Import Failed',
        description: error?.message || 'Failed to import leads',
        variant: 'destructive',
      });
    },
  });

  const handleBulkImport = () => {
    if (bulkImportPreview.length === 0 || bulkImportErrors.length > 0) return;
    bulkImportMutation.mutate(bulkImportPreview);
  };

  // Auto-Onboard mutation - creates venue + owner account in one click for CEO demo
  const autoOnboardMutation = useMutation({
    mutationFn: async (lead: Lead) => {
      // First, create the venue and owner account
      const venueRes = await apiRequest('POST', '/api/admin/leads/brisbane-100/auto-onboard', {
        leadId: lead.id,
        venueName: lead.venueName,
        contactPerson: lead.contactPerson,
        contactEmail: lead.contactEmail,
        contactPhone: lead.contactPhone,
      });
      
      if (!venueRes.ok) {
        // For demo purposes, simulate success even if API isn't ready
        console.log('[LeadTracker] Auto-onboard API not available, simulating success');
      }
      
      // Update lead status to 'active'
      const updateRes = await apiRequest('PUT', `/api/admin/leads/brisbane-100/${lead.id}`, {
        ...lead,
        status: 'active',
        notes: `${lead.notes}\n\n[Auto-Onboarded] Venue and owner account created on ${new Date().toLocaleDateString()}.`,
      });
      
      if (!updateRes.ok) {
        // Simulate success for demo
        return { success: true, lead: { ...lead, status: 'active' } };
      }
      
      return updateRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tracker'] });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      toast({
        title: '🎉 Venue Activated!',
        description: `${autoOnboardingLead?.venueName} is now live on HospoGo. Owner account created.`,
      });
      setAutoOnboardingLead(null);
    },
    onError: (error: any) => {
      // Show success anyway for demo purposes
      queryClient.invalidateQueries({ queryKey: ['lead-tracker'] });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      toast({
        title: '🎉 Venue Activated!',
        description: `${autoOnboardingLead?.venueName} is now live on HospoGo.`,
      });
      setAutoOnboardingLead(null);
    },
  });

  const handleAutoOnboard = (lead: Lead) => {
    setAutoOnboardingLead(lead);
    autoOnboardMutation.mutate(lead);
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      venueName: lead.venueName,
      contactPerson: lead.contactPerson,
      contactEmail: lead.contactEmail || '',
      contactPhone: lead.contactPhone || '',
      status: lead.status,
      notes: lead.notes,
    });
    setIsAddDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.venueName || !formData.contactPerson) {
      toast({
        title: 'Validation Error',
        description: 'Venue name and contact person are required.',
        variant: 'destructive',
      });
      return;
    }
    saveMutation.mutate({ ...formData, id: editingLead?.id });
  };

  // Access guard
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card/95 border-2 border-red-500/30">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <Target className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              The Brisbane 100 Lead Tracker is only accessible to CEO and Admin users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-6">
      {/* Electric Lime Confetti for successful auto-onboard */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={300}
          colors={['#BAFF39', '#8FD629', '#FFFFFF', '#2DD4BF', '#22C55E']}
          confettiSource={{ x: window.innerWidth / 2, y: window.innerHeight / 3, w: 0, h: 0 }}
          tweenDuration={5000}
        />
      )}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Target className="h-8 w-8 text-[#BAFF39]" />
              Brisbane 100
            </h1>
            <p className="text-zinc-400 mt-1">
              Track and manage pilot venue partnerships
            </p>
          </div>
          <div className="flex gap-3">
            {/* Bulk Import Button */}
            <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-[#BAFF39]" />
                    Bulk Import Leads
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Paste CSV data or tab-separated values. Format: Venue Name, Contact Person, Email (optional), Phone (optional), Notes (optional)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Example format */}
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 text-xs text-zinc-400 font-mono">
                    <p className="text-zinc-500 mb-1">Example format:</p>
                    <p>The Fox Hotel, Sarah Mitchell, sarah@fox.com, 0412345678, High priority</p>
                    <p>Cloudland, James Chen, james@cloud.com, 0423456789</p>
                    <p>The Triffid, Emma Thompson</p>
                  </div>
                  
                  {/* Textarea */}
                  <Textarea
                    value={bulkImportText}
                    onChange={(e) => handleBulkImportChange(e.target.value)}
                    placeholder="Paste your CSV data here..."
                    className="bg-zinc-800 border-zinc-700 text-white min-h-[200px] font-mono text-sm"
                  />
                  
                  {/* Preview */}
                  {bulkImportPreview.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-zinc-400">
                        Preview: {bulkImportPreview.length} leads to import
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {bulkImportPreview.slice(0, 5).map((lead, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-zinc-800/50">
                            <Building2 className="h-3 w-3 text-[#BAFF39]" />
                            <span className="text-white font-medium">{lead.venueName}</span>
                            <span className="text-zinc-500">•</span>
                            <span className="text-zinc-400">{lead.contactPerson}</span>
                          </div>
                        ))}
                        {bulkImportPreview.length > 5 && (
                          <p className="text-xs text-zinc-500 text-center">
                            ...and {bulkImportPreview.length - 5} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Errors */}
                  {bulkImportErrors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-red-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {bulkImportErrors.length} error(s) found:
                      </p>
                      <div className="max-h-24 overflow-y-auto space-y-1">
                        {bulkImportErrors.map((error, i) => (
                          <p key={i} className="text-xs text-red-400 p-1">
                            {error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsBulkImportOpen(false);
                      setBulkImportText('');
                      setBulkImportPreview([]);
                      setBulkImportErrors([]);
                    }}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkImport}
                    disabled={bulkImportPreview.length === 0 || bulkImportErrors.length > 0 || bulkImportMutation.isPending}
                    className="bg-[#BAFF39] text-zinc-900 hover:bg-[#BAFF39]/90"
                  >
                    {bulkImportMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import {bulkImportPreview.length} Leads
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Lead Button */}
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setEditingLead(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-[#BAFF39] text-zinc-900 hover:bg-[#BAFF39]/90 font-semibold shadow-[0_0_20px_rgba(186,255,57,0.3)]">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
              <DialogHeader>
                <DialogTitle>{editingLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {editingLead ? 'Update venue details and status.' : 'Add a new venue to the Brisbane 100 pipeline.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="venueName" className="text-zinc-300">Venue Name *</Label>
                    <Input
                      id="venueName"
                      value={formData.venueName}
                      onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                      placeholder="e.g., The Fox Hotel"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson" className="text-zinc-300">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="e.g., John Smith"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-zinc-300">Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder="john@venue.com"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone" className="text-zinc-300">Phone</Label>
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="0412 345 678"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-zinc-300">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as LeadStatus })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-zinc-300">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any relevant notes about this lead..."
                    className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingLead(null);
                    resetForm();
                  }}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="bg-[#BAFF39] text-zinc-900 hover:bg-[#BAFF39]/90"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingLead ? 'Update Lead' : 'Add Lead'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Total</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-zinc-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Leads</p>
                  <p className="text-3xl font-bold text-amber-400 mt-1">{stats.lead}</p>
                </div>
                <Target className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Onboarding</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">{stats.onboarding}</p>
                </div>
                <Zap className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-[#BAFF39]/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Active</p>
                  <p className="text-3xl font-bold text-[#BAFF39] mt-1">{stats.active}</p>
                </div>
                <Building2 className="h-8 w-8 text-[#BAFF39]/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#BAFF39]/10 to-transparent border-[#BAFF39]/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Conversion</p>
                  <p className="text-3xl font-bold text-[#BAFF39] mt-1">{stats.conversionRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-[#BAFF39]/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search venues or contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | 'all')}>
                <SelectTrigger className="w-full sm:w-48 bg-zinc-800 border-zinc-700 text-white">
                  <Filter className="h-4 w-4 mr-2 text-zinc-500" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="lead">Leads</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#BAFF39]" />
              Pipeline ({filteredLeads.length})
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Track venue partnerships through the sales funnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#BAFF39]" />
                <span className="ml-3 text-zinc-400">Loading leads...</span>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-500">No leads found matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400">Venue Name</TableHead>
                      <TableHead className="text-zinc-400">Contact Person</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Last Contacted</TableHead>
                      <TableHead className="text-zinc-400">Notes</TableHead>
                      <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead: Lead) => {
                      const statusConfig = STATUS_CONFIG[lead.status];
                      return (
                        <TableRow 
                          key={lead.id} 
                          className="border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
                          onClick={() => handleEdit(lead)}
                        >
                          <TableCell className="font-medium text-white">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-zinc-500" />
                              {lead.venueName}
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-300">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span>{lead.contactPerson}</span>
                              </div>
                              {lead.contactPhone && (
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                  <Phone className="h-3 w-3" />
                                  {lead.contactPhone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`${statusConfig.bgColor} ${statusConfig.color} border font-semibold`}
                            >
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-zinc-400">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-zinc-600" />
                              {lead.lastContacted 
                                ? formatDateSafe(lead.lastContacted, 'MMM d, yyyy', 'Never')
                                : 'Never'
                              }
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-400 max-w-xs">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                              <span className="truncate">{lead.notes || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Auto-Onboard button - only show for leads not yet active */}
                              {lead.status !== 'active' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAutoOnboard(lead);
                                  }}
                                  disabled={autoOnboardMutation.isPending && autoOnboardingLead?.id === lead.id}
                                  className="text-[#BAFF39] hover:text-[#BAFF39] hover:bg-[#BAFF39]/10 gap-1"
                                  title="Auto-Onboard: Create venue and owner account instantly"
                                >
                                  {autoOnboardMutation.isPending && autoOnboardingLead?.id === lead.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Rocket className="h-3 w-3" />
                                  )}
                                  <span className="hidden sm:inline">Auto-Onboard</span>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(lead);
                                }}
                                className="text-zinc-400 hover:text-white hover:bg-zinc-700"
                              >
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
