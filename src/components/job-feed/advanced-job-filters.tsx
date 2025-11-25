import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Filter, X, Search, MapPin, DollarSign, Calendar } from "lucide-react";

export interface JobFilterOptions {
  searchQuery: string;
  location: string;
  payRateMin: number;
  payRateMax: number;
  payType: string;
  skillsRequired: string[];
  dateRange: string;
}

interface AdvancedJobFiltersProps {
  filters: JobFilterOptions;
  onFiltersChange: (filters: JobFilterOptions) => void;
  onClearFilters: () => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const COMMON_SKILLS = [
  "Fades", "Beard Trim", "Hair Washing", "Styling", "Coloring", 
  "Highlights", "Perm", "Straightening", "Braiding", "Extensions",
  "Manicure", "Pedicure", "Facial", "Massage", "Waxing"
];

export default function AdvancedJobFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  isExpanded,
  onToggleExpanded
}: AdvancedJobFiltersProps) {
  const [newSkill, setNewSkill] = useState("");

  const handleFilterChange = (key: keyof JobFilterOptions, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleAddSkill = (skill: string) => {
    if (skill && !filters.skillsRequired.includes(skill)) {
      handleFilterChange('skillsRequired', [...filters.skillsRequired, skill]);
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    handleFilterChange('skillsRequired', filters.skillsRequired.filter(skill => skill !== skillToRemove));
  };

  const hasActiveFilters = () => {
    return filters.searchQuery || 
           filters.location || 
           filters.payRateMin > 0 || 
           filters.payRateMax < 500 ||
           filters.payType !== 'all' ||
           filters.skillsRequired.length > 0 ||
           filters.dateRange !== 'all';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Job Search & Filters
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters() && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                data-testid="button-clear-filters"
              >
                Clear All
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleExpanded}
              data-testid="button-toggle-filters"
            >
              <Filter className="mr-2 h-4 w-4" />
              {isExpanded ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Query - Always Visible */}
        <div>
          <Label htmlFor="searchQuery">Search Jobs</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="searchQuery"
              type="text"
              placeholder="Search by job title, description, or keywords..."
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              className="pl-10"
              data-testid="input-job-search"
            />
          </div>
        </div>

        {/* Advanced Filters - Collapsible */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            {/* Location Filter */}
            <div>
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="location"
                type="text"
                placeholder="City, state, or region..."
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                data-testid="input-location-filter"
              />
            </div>

            {/* Pay Rate Filter */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4" />
                Pay Rate Range: ${filters.payRateMin} - ${filters.payRateMax}
              </Label>
              <div className="px-2">
                <Slider
                  value={[filters.payRateMin, filters.payRateMax]}
                  onValueChange={(value) => {
                    handleFilterChange('payRateMin', value[0]);
                    handleFilterChange('payRateMax', value[1]);
                  }}
                  min={0}
                  max={500}
                  step={5}
                  className="w-full py-4"
                  data-testid="slider-pay-range"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>$0</span>
                  <span>$500+</span>
                </div>
              </div>
            </div>

            {/* Pay Type Filter */}
            <div>
              <Label htmlFor="payType">Pay Type</Label>
              <Select
                value={filters.payType}
                onValueChange={(value) => handleFilterChange('payType', value)}
              >
                <SelectTrigger data-testid="select-pay-type">
                  <SelectValue placeholder="Select pay type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pay Types</SelectItem>
                  <SelectItem value="hour">Per Hour</SelectItem>
                  <SelectItem value="day">Per Day</SelectItem>
                  <SelectItem value="shift">Per Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div>
              <Label htmlFor="dateRange" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => handleFilterChange('dateRange', value)}
              >
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="next-week">Next Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Skills Filter */}
            <div>
              <Label className="text-base font-medium mb-3 block">Required Skills</Label>
              
              {/* Add Skills Input */}
              <div className="flex gap-2 mb-3">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill to filter by..."
                  data-testid="input-skill-filter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(newSkill);
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => handleAddSkill(newSkill)}
                  variant="outline"
                  data-testid="button-add-skill-filter"
                >
                  Add
                </Button>
              </div>

              {/* Common Skills Quick Add */}
              <div className="mb-3">
                <p className="text-sm text-muted-foreground mb-2">Quick add:</p>
                <div className="flex flex-wrap gap-1">
                  {COMMON_SKILLS.filter(skill => !filters.skillsRequired.includes(skill)).slice(0, 8).map((skill) => (
                    <Button
                      key={skill}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSkill(skill)}
                      className="text-xs h-7"
                      data-testid={`button-add-skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {skill}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Selected Skills */}
              {filters.skillsRequired.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Filtering by:</p>
                  <div className="flex flex-wrap gap-2">
                    {filters.skillsRequired.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemoveSkill(skill)}
                        data-testid={`skill-filter-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {skill} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Summary */}
            {hasActiveFilters() && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-1">Active Filters:</p>
                <div className="text-xs text-blue-800 space-y-1">
                  {filters.searchQuery && <p>• Search: "{filters.searchQuery}"</p>}
                  {filters.location && <p>• Location: {filters.location}</p>}
                  {(filters.payRateMin > 0 || filters.payRateMax < 500) && (
                    <p>• Pay: ${filters.payRateMin} - ${filters.payRateMax}</p>
                  )}
                  {filters.payType !== 'all' && <p>• Pay Type: {filters.payType}</p>}
                  {filters.dateRange !== 'all' && <p>• Date: {filters.dateRange}</p>}
                  {filters.skillsRequired.length > 0 && (
                    <p>• Skills: {filters.skillsRequired.join(', ')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}