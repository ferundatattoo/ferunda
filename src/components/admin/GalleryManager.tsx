import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Upload, Eye, EyeOff, Image as ImageIcon } from "lucide-react";

interface GalleryImage {
  id: string;
  title: string;
  image_url: string;
  display_order: number;
  is_visible: boolean;
  section: string;
  created_at: string;
}

const GalleryManager = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSection, setNewSection] = useState("gallery");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .order("section")
        .order("display_order");

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Error fetching images:", error);
      toast.error("Failed to load gallery images");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newTitle.trim()) {
      toast.error("Please select an image and enter a title");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery-images")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("gallery-images")
        .getPublicUrl(fileName);

      const maxOrder = Math.max(...images.filter(img => img.section === newSection).map(img => img.display_order), -1);

      const { error: insertError } = await supabase
        .from("gallery_images")
        .insert({
          title: newTitle.trim(),
          image_url: publicUrl,
          display_order: maxOrder + 1,
          section: newSection,
          is_visible: true,
        });

      if (insertError) throw insertError;

      toast.success("Image uploaded successfully");
      setSelectedFile(null);
      setPreviewUrl(null);
      setNewTitle("");
      fetchImages();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleVisibility = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("gallery_images")
        .update({ is_visible: !currentState })
        .eq("id", id);

      if (error) throw error;
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, is_visible: !currentState } : img
      ));
      toast.success(`Image ${!currentState ? "shown" : "hidden"}`);
    } catch (error) {
      console.error("Toggle error:", error);
      toast.error("Failed to update visibility");
    }
  };

  const deleteImage = async (id: string, imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      // Extract filename from URL
      const fileName = imageUrl.split("/").pop();
      
      if (fileName) {
        await supabase.storage.from("gallery-images").remove([fileName]);
      }

      const { error } = await supabase
        .from("gallery_images")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setImages(prev => prev.filter(img => img.id !== id));
      toast.success("Image deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete image");
    }
  };

  const updateTitle = async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from("gallery_images")
        .update({ title })
        .eq("id", id);

      if (error) throw error;
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, title } : img
      ));
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update title");
    }
  };

  const updateSection = async (id: string, section: string) => {
    try {
      const { error } = await supabase
        .from("gallery_images")
        .update({ section })
        .eq("id", id);

      if (error) throw error;
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, section } : img
      ));
      toast.success("Section updated");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update section");
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedImage = images.find(img => img.id === draggedId);
    const targetImage = images.find(img => img.id === targetId);

    if (!draggedImage || !targetImage || draggedImage.section !== targetImage.section) {
      setDraggedId(null);
      return;
    }

    // Swap orders
    const newImages = [...images];
    const draggedIdx = newImages.findIndex(img => img.id === draggedId);
    const targetIdx = newImages.findIndex(img => img.id === targetId);

    const tempOrder = newImages[draggedIdx].display_order;
    newImages[draggedIdx].display_order = newImages[targetIdx].display_order;
    newImages[targetIdx].display_order = tempOrder;

    setImages(newImages);
    setDraggedId(null);

    try {
      await Promise.all([
        supabase.from("gallery_images").update({ display_order: newImages[draggedIdx].display_order }).eq("id", draggedId),
        supabase.from("gallery_images").update({ display_order: newImages[targetIdx].display_order }).eq("id", targetId),
      ]);
      toast.success("Order updated");
    } catch (error) {
      console.error("Reorder error:", error);
      toast.error("Failed to reorder");
      fetchImages();
    }
  };

  const groupedImages = images.reduce((acc, img) => {
    if (!acc[img.section]) acc[img.section] = [];
    acc[img.section].push(img);
    return acc;
  }, {} as Record<string, GalleryImage[]>);

  // Sort each section by display_order
  Object.keys(groupedImages).forEach(section => {
    groupedImages[section].sort((a, b) => a.display_order - b.display_order);
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading gallery...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Image File</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="bg-secondary"
                />
              </div>
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover rounded" />
              )}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter image title"
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={newSection} onValueChange={setNewSection}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gallery">Main Gallery</SelectItem>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="hero">Hero Section</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Image"}
          </Button>
        </CardContent>
      </Card>

      {/* Gallery Sections */}
      {Object.entries(groupedImages).map(([section, sectionImages]) => (
        <Card key={section} className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 capitalize">
              <ImageIcon className="w-5 h-5" />
              {section} ({sectionImages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sectionImages.map((image) => (
                <div
                  key={image.id}
                  draggable
                  onDragStart={() => handleDragStart(image.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(image.id)}
                  className={`relative group border border-border rounded-lg overflow-hidden ${
                    draggedId === image.id ? "opacity-50" : ""
                  } ${!image.is_visible ? "opacity-60" : ""}`}
                >
                  <div className="absolute top-2 left-2 z-10 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-5 h-5 text-foreground bg-background/80 rounded p-0.5" />
                  </div>
                  <img
                    src={image.image_url}
                    alt={image.title}
                    className="w-full aspect-[3/4] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                      <Input
                        value={image.title}
                        onChange={(e) => updateTitle(image.id, e.target.value)}
                        onBlur={() => toast.success("Title saved")}
                        className="text-xs h-8 bg-background/80"
                      />
                      <Select value={image.section} onValueChange={(val) => updateSection(image.id, val)}>
                        <SelectTrigger className="h-8 text-xs bg-background/80">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gallery">Gallery</SelectItem>
                          <SelectItem value="featured">Featured</SelectItem>
                          <SelectItem value="hero">Hero</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center justify-between">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleVisibility(image.id, image.is_visible)}
                          className="h-8 px-2"
                        >
                          {image.is_visible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteImage(image.id, image.image_url)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {!image.is_visible && (
                    <div className="absolute top-2 right-2">
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {sectionImages.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No images in this section</p>
            )}
          </CardContent>
        </Card>
      ))}

      {images.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No gallery images yet. Upload your first image above!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GalleryManager;
