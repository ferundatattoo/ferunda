import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, MapPin, Ruler, Droplets, Clock, FileText, 
  Plus, Check, AlertCircle, Upload, X, Loader2, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProjectNote {
  id: string;
  note_type: string;
  content: string;
  is_acknowledged: boolean;
  created_at: string;
}

interface ClientDocument {
  id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  description: string;
  uploaded_at: string;
}

interface PortalProjectTabProps {
  booking: any;
  notes: ProjectNote[];
  documents: ClientDocument[];
  onRefresh: () => void;
}

export default function PortalProjectTab({ 
  booking, 
  notes, 
  documents, 
  onRefresh 
}: PortalProjectTabProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<string>('design_idea');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const [uploadType, setUploadType] = useState<string>('placement_photo');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tattoo Plan fields
  const planFields = [
    { key: 'style', label: 'Style', value: booking?.style || 'Not defined', icon: Palette },
    { key: 'subject', label: 'Subject', value: booking?.tattoo_description || 'Not defined', icon: FileText },
    { key: 'placement', label: 'Placement', value: booking?.placement || 'Not defined', icon: MapPin },
    { key: 'size', label: 'Approximate size', value: booking?.size || 'Not defined', icon: Ruler },
    { key: 'color', label: 'Color', value: 'To be discussed', icon: Droplets },
    { key: 'duration', label: 'Estimated session time', value: booking?.estimated_duration || 'To be determined', icon: Clock },
  ];

  // Get notes by type
  const allergies = notes.filter(n => n.note_type === 'allergy' || n.note_type === 'medical');
  const designIdeas = notes.filter(n => n.note_type === 'design_idea');
  const specialRequests = notes.filter(n => n.note_type === 'special_request');
  const placementNotes = notes.filter(n => n.note_type === 'placement_note');
  
  // Get documents by type
  const placementPhotos = documents.filter(d => d.document_type === 'placement_photo');
  const referenceImages = documents.filter(d => d.document_type === 'reference' || d.document_type === 'inspiration');

  const handleAddNote = async () => {
    if (!newNote.trim() || isSaving) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('client_project_notes')
        .insert({
          booking_id: booking.id,
          note_type: noteType,
          content: newNote.trim()
        });

      if (error) throw error;
      
      toast.success('Added successfully');
      setNewNote('');
      setExpandedSection(null);
      onRefresh();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Could not save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File must be under 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || isUploading) return;
    
    setIsUploading(true);
    try {
      const fileName = `${booking.id}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('customer-references')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-references')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          booking_id: booking.id,
          document_type: uploadType,
          file_url: publicUrl,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          description: fileDescription
        });

      if (dbError) throw dbError;
      
      toast.success('Document uploaded');
      setSelectedFile(null);
      setFileDescription('');
      setExpandedSection(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onRefresh();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="font-display text-3xl text-foreground mb-2">Tattoo Plan</h2>
        <div className="w-16 h-px bg-border mx-auto" />
      </div>

      {/* Tattoo Plan - Dossier Style */}
      <div className="space-y-1">
        {planFields.map((field, index) => (
          <motion.div
            key={field.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group flex items-center justify-between py-4 border-b border-border/50 hover:bg-muted/30 transition-colors px-4 -mx-4 cursor-default"
          >
            <div className="flex items-center gap-3">
              <field.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground uppercase tracking-wide">{field.label}</span>
            </div>
            <span className="text-foreground font-body">{field.value}</span>
          </motion.div>
        ))}
      </div>

      {/* Status Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <span className="text-sm text-muted-foreground">Status: <span className="text-foreground">Draft</span></span>
      </div>

      {/* Divider */}
      <div className="py-8">
        <div className="w-full h-px bg-border" />
      </div>

      {/* Additional Information Sections */}
      <div className="space-y-6">
        {/* Allergies & Medical */}
        <Section
          title="Allergies & Medical Notes"
          icon={AlertCircle}
          items={allergies}
          isExpanded={expandedSection === 'allergy'}
          onToggle={() => setExpandedSection(expandedSection === 'allergy' ? null : 'allergy')}
          onAdd={() => {
            setNoteType('allergy');
            setExpandedSection('allergy-add');
          }}
          showAddForm={expandedSection === 'allergy-add'}
          addPlaceholder="Any allergies, medical conditions, or medications I should know about..."
          newNote={newNote}
          setNewNote={setNewNote}
          onSave={handleAddNote}
          isSaving={isSaving}
          onCancel={() => setExpandedSection(null)}
        />

        {/* Design Ideas */}
        <Section
          title="Design Ideas & Preferences"
          icon={Palette}
          items={designIdeas}
          isExpanded={expandedSection === 'design'}
          onToggle={() => setExpandedSection(expandedSection === 'design' ? null : 'design')}
          onAdd={() => {
            setNoteType('design_idea');
            setExpandedSection('design-add');
          }}
          showAddForm={expandedSection === 'design-add'}
          addPlaceholder="Share your vision, style preferences, or specific elements you'd like included..."
          newNote={newNote}
          setNewNote={setNewNote}
          onSave={handleAddNote}
          isSaving={isSaving}
          onCancel={() => setExpandedSection(null)}
        />

        {/* Special Requests */}
        <Section
          title="Special Requests"
          icon={FileText}
          items={specialRequests}
          isExpanded={expandedSection === 'requests'}
          onToggle={() => setExpandedSection(expandedSection === 'requests' ? null : 'requests')}
          onAdd={() => {
            setNoteType('special_request');
            setExpandedSection('requests-add');
          }}
          showAddForm={expandedSection === 'requests-add'}
          addPlaceholder="Any special accommodations, timing preferences, or other requests..."
          newNote={newNote}
          setNewNote={setNewNote}
          onSave={handleAddNote}
          isSaving={isSaving}
          onCancel={() => setExpandedSection(null)}
        />

        {/* Placement Photos */}
        <DocumentSection
          title="Placement Photos"
          icon={Image}
          documents={placementPhotos}
          isExpanded={expandedSection === 'placement-photos'}
          onToggle={() => setExpandedSection(expandedSection === 'placement-photos' ? null : 'placement-photos')}
          onAdd={() => {
            setUploadType('placement_photo');
            setExpandedSection('upload-placement');
          }}
          showUploadForm={expandedSection === 'upload-placement'}
          selectedFile={selectedFile}
          fileDescription={fileDescription}
          setFileDescription={setFileDescription}
          fileInputRef={fileInputRef}
          handleFileSelect={handleFileSelect}
          handleUpload={handleUploadDocument}
          isUploading={isUploading}
          onCancel={() => {
            setExpandedSection(null);
            setSelectedFile(null);
          }}
          clearFile={() => setSelectedFile(null)}
        />

        {/* Additional References */}
        <DocumentSection
          title="Additional References"
          icon={Upload}
          documents={referenceImages}
          isExpanded={expandedSection === 'references'}
          onToggle={() => setExpandedSection(expandedSection === 'references' ? null : 'references')}
          onAdd={() => {
            setUploadType('reference');
            setExpandedSection('upload-reference');
          }}
          showUploadForm={expandedSection === 'upload-reference'}
          selectedFile={selectedFile}
          fileDescription={fileDescription}
          setFileDescription={setFileDescription}
          fileInputRef={fileInputRef}
          handleFileSelect={handleFileSelect}
          handleUpload={handleUploadDocument}
          isUploading={isUploading}
          onCancel={() => {
            setExpandedSection(null);
            setSelectedFile(null);
          }}
          clearFile={() => setSelectedFile(null)}
        />
      </div>
    </div>
  );
}

// Reusable Section Component for notes
interface SectionProps {
  title: string;
  icon: any;
  items: ProjectNote[];
  isExpanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  showAddForm: boolean;
  addPlaceholder: string;
  newNote: string;
  setNewNote: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  onCancel: () => void;
}

function Section({
  title, icon: Icon, items, isExpanded, onToggle, onAdd,
  showAddForm, addPlaceholder, newNote, setNewNote, onSave, isSaving, onCancel
}: SectionProps) {
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="font-body text-foreground">{title}</span>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {items.length}
            </span>
          )}
        </div>
        <Plus className="w-4 h-4 text-muted-foreground" />
      </button>
      
      <AnimatePresence>
        {(isExpanded || showAddForm) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50"
          >
            <div className="p-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">{item.content}</p>
                </div>
              ))}
              
              {showAddForm && (
                <div className="space-y-3 pt-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={addPlaceholder}
                    rows={3}
                    className="resize-none bg-background border-border/50"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={onCancel}>
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={onSave} 
                      disabled={!newNote.trim() || isSaving}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>
              )}
              
              {!showAddForm && (
                <Button variant="ghost" size="sm" onClick={onAdd} className="w-full justify-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Document Section Component
interface DocumentSectionProps {
  title: string;
  icon: any;
  documents: ClientDocument[];
  isExpanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  showUploadForm: boolean;
  selectedFile: File | null;
  fileDescription: string;
  setFileDescription: (value: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => void;
  isUploading: boolean;
  onCancel: () => void;
  clearFile: () => void;
}

function DocumentSection({
  title, icon: Icon, documents, isExpanded, onToggle, onAdd,
  showUploadForm, selectedFile, fileDescription, setFileDescription,
  fileInputRef, handleFileSelect, handleUpload, isUploading, onCancel, clearFile
}: DocumentSectionProps) {
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="font-body text-foreground">{title}</span>
          {documents.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {documents.length}
            </span>
          )}
        </div>
        <Plus className="w-4 h-4 text-muted-foreground" />
      </button>
      
      <AnimatePresence>
        {(isExpanded || showUploadForm) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50"
          >
            <div className="p-4 space-y-3">
              {documents.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={doc.file_url} 
                        alt={doc.description || doc.file_name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {showUploadForm && (
                <div className="space-y-3 pt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,.pdf"
                    className="hidden"
                  />
                  
                  {selectedFile ? (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Image className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={clearFile}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-8 border-2 border-dashed border-border/50 rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to select file</p>
                    </button>
                  )}
                  
                  {selectedFile && (
                    <Input
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      placeholder="Optional description..."
                      className="bg-background"
                    />
                  )}
                  
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={onCancel}>
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleUpload} 
                      disabled={!selectedFile || isUploading}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
                    </Button>
                  </div>
                </div>
              )}
              
              {!showUploadForm && (
                <Button variant="ghost" size="sm" onClick={onAdd} className="w-full justify-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
