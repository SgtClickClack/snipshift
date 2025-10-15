import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface MobileJobFilterProps {
  filters: {
    location: string;
    payRange: string;
    jobType: string;
    experience: string;
  };
  onApply: (filters: any) => void;
  onClose: () => void;
}

export default function MobileJobFilter({ filters, onApply, onClose }: MobileJobFilterProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleClear = () => {
    setLocalFilters({
      location: '',
      payRange: '',
      jobType: '',
      experience: ''
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
      <div 
        className="w-full bg-white rounded-t-lg max-h-[80vh] overflow-y-auto"
        data-testid="mobile-filter-panel"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Filter Jobs</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {/* Location Filter */}
          <div>
            <Label htmlFor="location" className="text-sm font-medium">
              Location
            </Label>
            <Input
              id="location"
              placeholder="Enter city or area"
              value={localFilters.location}
              onChange={(e) => setLocalFilters({ ...localFilters, location: e.target.value })}
              className="mt-2"
              data-testid="input-location-filter"
            />
          </div>

          {/* Pay Range Filter */}
          <div>
            <Label className="text-sm font-medium">Pay Range</Label>
            <Select 
              value={localFilters.payRange} 
              onValueChange={(value) => setLocalFilters({ ...localFilters, payRange: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select pay range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-20">$0 - $20/hr</SelectItem>
                <SelectItem value="20-30">$20 - $30/hr</SelectItem>
                <SelectItem value="30-40">$30 - $40/hr</SelectItem>
                <SelectItem value="40-50">$40 - $50/hr</SelectItem>
                <SelectItem value="50+">$50+/hr</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Job Type Filter */}
          <div>
            <Label className="text-sm font-medium">Job Type</Label>
            <Select 
              value={localFilters.jobType} 
              onValueChange={(value) => setLocalFilters({ ...localFilters, jobType: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">Full Time</SelectItem>
                <SelectItem value="part-time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="temporary">Temporary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Experience Level Filter */}
          <div>
            <Label className="text-sm font-medium">Experience Level</Label>
            <Select 
              value={localFilters.experience} 
              onValueChange={(value) => setLocalFilters({ ...localFilters, experience: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry Level</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div>
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="mt-2 space-y-2">
              <div>
                <Label htmlFor="start-date" className="text-xs text-steel-600">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  className="mt-1"
                  data-testid="mobile-start-date"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs text-steel-600">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  className="mt-1"
                  data-testid="mobile-end-date"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-steel-50">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClear}
              data-testid="button-clear-filters"
            >
              Clear All
            </Button>
            <Button
              className="flex-1"
              onClick={handleApply}
              data-testid="button-apply-location-filter"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
