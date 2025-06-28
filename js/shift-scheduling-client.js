// Shift Scheduling Client API
// Handles all frontend API calls for the shift scheduling system

class ShiftSchedulingAPI {
    constructor() {
        // No longer use a single baseURL; use full paths per resource
        this.cache = {
            templates: null,
            rotations: null,
            employees: null,
            assignments: null
        };
    }

    // Generic API call method
    async apiCall(fullUrl, options = {}) {
        try {
            const url = fullUrl;
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error (${fullUrl}):`, error);
            throw error;
        }
    }

    // ========================================
    // SHIFT TEMPLATES API METHODS
    // ========================================

    async getTemplates() {
        if (this.cache.templates) {
            return this.cache.templates;
        }

        const result = await this.apiCall('/api/shift-templates');
        this.cache.templates = result.data;
        return result.data;
    }

    async getActiveTemplates() {
        const result = await this.apiCall('/api/shift-templates/active');
        return result.data;
    }

    async createTemplate(templateData) {
        const result = await this.apiCall('/api/shift-templates', {
            method: 'POST',
            body: JSON.stringify(templateData)
        });
        this.cache.templates = null;
        return result.data;
    }

    async updateTemplate(id, templateData) {
        const result = await this.apiCall(`/api/shift-templates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(templateData)
        });
        this.cache.templates = null;
        return result.data;
    }

    async deleteTemplate(id) {
        const result = await this.apiCall(`/api/shift-templates/${id}`, {
            method: 'DELETE'
        });
        this.cache.templates = null;
        return result;
    }

    // ========================================
    // SHIFT ROTATIONS API METHODS
    // ========================================

    async getRotations() {
        if (this.cache.rotations) {
            return this.cache.rotations;
        }

        const result = await this.apiCall('/api/shift-rotations');
        this.cache.rotations = result.data;
        return result.data;
    }

    async getRotationDetails(id) {
        const result = await this.apiCall(`/api/shift-rotations/${id}`);
        return result.data;
    }

    async getRotationSequence(id) {
        const result = await this.apiCall(`/api/shift-rotations/${id}/sequence`);
        return result.data;
    }

    async createRotation(rotationData) {
        const result = await this.apiCall('/api/shift-rotations', {
            method: 'POST',
            body: JSON.stringify(rotationData)
        });
        this.cache.rotations = null;
        return result.data;
    }

    async updateRotation(id, rotationData) {
        const result = await this.apiCall(`/api/shift-rotations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(rotationData)
        });
        this.cache.rotations = null;
        return result.data;
    }

    async deleteRotation(id) {
        const result = await this.apiCall(`/api/shift-rotations/${id}`, {
            method: 'DELETE'
        });
        this.cache.rotations = null;
        return result;
    }

    async pauseRotation(id) {
        const result = await this.apiCall(`/api/shift-rotations/${id}/pause`, {
            method: 'POST'
        });
        this.cache.rotations = null;
        return result.data;
    }

    async resumeRotation(id) {
        const result = await this.apiCall(`/api/shift-rotations/${id}/resume`, {
            method: 'POST'
        });
        this.cache.rotations = null;
        return result.data;
    }

    // ========================================
    // SHIFT ASSIGNMENTS API METHODS
    // ========================================

    async getAssignments(filters = {}) {
        // Build query string
        const params = new URLSearchParams(filters).toString();
        const url = params ? `/api/shift-assignments?${params}` : '/api/shift-assignments';
        const result = await this.apiCall(url);
        this.cache.assignments = result.data;
        return result.data;
    }

    async createAssignment(assignmentData) {
        const result = await this.apiCall('/api/shift-assignments', {
            method: 'POST',
            body: JSON.stringify(assignmentData)
        });
        this.cache.assignments = null;
        return result.data;
    }

    async updateAssignment(id, assignmentData) {
        const result = await this.apiCall(`/api/shift-assignments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(assignmentData)
        });
        this.cache.assignments = null;
        return result.data;
    }

    async deleteAssignment(id) {
        const result = await this.apiCall(`/api/shift-assignments/${id}`, {
            method: 'DELETE'
        });
        this.cache.assignments = null;
        return result;
    }

    // ========================================
    // EMPLOYEES API METHODS
    // ========================================

    async getEmployees() {
        if (this.cache.employees) {
            return this.cache.employees;
        }
        const result = await this.apiCall('/api/employees');
        this.cache.employees = result.data;
        return result.data;
    }

    // ========================================
    // RECURRING SHIFT PATTERNS API METHODS
    // ========================================

    async getRecurringPatterns() {
        const result = await this.apiCall('/api/shift-recurring-patterns');
        return result.data;
    }

    async createRecurringPattern(patternData) {
        const result = await this.apiCall('/api/shift-recurring-patterns', {
            method: 'POST',
            body: JSON.stringify(patternData)
        });
        return result.data;
    }

    async updateRecurringPattern(id, patternData) {
        const result = await this.apiCall(`/api/shift-recurring-patterns/${id}`, {
            method: 'PUT',
            body: JSON.stringify(patternData)
        });
        return result.data;
    }

    async deleteRecurringPattern(id) {
        const result = await this.apiCall(`/api/shift-recurring-patterns/${id}`, {
            method: 'DELETE'
        });
        return result;
    }

    // ========================================
    // UTILITY API METHODS
    // ========================================

    async checkConflicts(conflictData) {
        const result = await this.apiCall('/check-conflicts', {
            method: 'POST',
            body: JSON.stringify(conflictData)
        });
        return result;
    }

    // ========================================
    // CACHE MANAGEMENT
    // ========================================

    clearCache(type = null) {
        if (type) {
            this.cache[type] = null;
        } else {
            this.cache = {
                templates: null,
                rotations: null,
                employees: null,
                assignments: null
            };
        }
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    // Format time for display
    formatTime(timeString) {
        if (!timeString) return '';
        const time = new Date(`2000-01-01T${timeString}`);
        return time.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }

    // Format date for display
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    // Calculate shift duration in hours
    calculateDuration(startTime, endTime) {
        if (!startTime || !endTime) return 0;
        
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        
        // Handle overnight shifts
        if (end < start) {
            end.setDate(end.getDate() + 1);
        }
        
        const diffMs = end - start;
        return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }

    // Validate shift assignment data
    validateAssignmentData(data) {
        const errors = [];

        if (!data.template_id) errors.push('Template is required');
        if (!data.employee_id) errors.push('Employee is required');
        if (!data.date) errors.push('Date is required');
        if (!data.start_time) errors.push('Start time is required');
        if (!data.end_time) errors.push('End time is required');

        if (data.start_time && data.end_time) {
            const start = new Date(`2000-01-01T${data.start_time}`);
            const end = new Date(`2000-01-01T${data.end_time}`);
            
            if (end <= start && !this.isOvernightShift(data.start_time, data.end_time)) {
                errors.push('End time must be after start time');
            }
        }

        return errors;
    }

    // Check if shift is overnight
    isOvernightShift(startTime, endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        return end < start;
    }

    // Generate color for shift template
    generateColor() {
        const colors = [
            '#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1',
            '#fd7e14', '#20c997', '#e83e8c', '#6c757d', '#17a2b8'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

// Create global instance
window.shiftSchedulingAPI = new ShiftSchedulingAPI();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShiftSchedulingAPI;
} 