import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar, Clock, Image, Video, Sparkles, Send, X, Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScheduledPost {
  id: string;
  content_type: string;
  caption: string;
  hashtags: string[];
  scheduled_at: string;
  status: string;
}

export function ContentScheduler() {
  const { toast } = useToast();
  const [caption, setCaption] = useState('');
  const [contentType, setContentType] = useState('image');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');

  const addHashtag = () => {
    if (newHashtag && !hashtags.includes(newHashtag)) {
      setHashtags([...hashtags, newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`]);
      setNewHashtag('');
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter(h => h !== tag));
  };

  const generateCaption = () => {
    // Simulated AI caption generation
    setCaption('✨ Another piece of wearable art completed! This fine-line botanical sleeve represents growth, resilience, and the beauty of nature. 🌿\n\nSwipe to see the details →\n\n📍 Currently booking for February\n💬 DM for inquiries');
    toast({
      title: 'Caption generado',
      description: 'Caption optimizado con IA'
    });
  };

  const generateHashtags = () => {
    setHashtags([
      '#tattoostudio', '#finelinetattoo', '#botanicaltattoo',
      '#tattooartist', '#inkstagram', '#tattoodesign',
      '#minimalisttattoo', '#tattooinspiration'
    ]);
    toast({
      title: 'Hashtags generados',
      description: '8 hashtags relevantes añadidos'
    });
  };

  const schedulePosts: ScheduledPost[] = [
    { id: '1', content_type: 'reel', caption: 'Session timelapse...', hashtags: ['#tattoo'], scheduled_at: '2026-01-03T10:00:00', status: 'scheduled' },
    { id: '2', content_type: 'carousel', caption: 'Before/After...', hashtags: ['#coverup'], scheduled_at: '2026-01-03T18:00:00', status: 'scheduled' },
    { id: '3', content_type: 'image', caption: 'Fresh ink...', hashtags: ['#freshink'], scheduled_at: '2026-01-04T12:00:00', status: 'scheduled' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Create Post */}
      <Card className="backdrop-blur-sm bg-white/60 border-white/20">
        <CardHeader>
          <CardTitle className="text-lg">Crear Publicación</CardTitle>
          <CardDescription>Programa contenido para tus redes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de contenido</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image"><div className="flex items-center gap-2"><Image className="w-4 h-4" />Imagen</div></SelectItem>
                <SelectItem value="carousel"><div className="flex items-center gap-2"><Image className="w-4 h-4" />Carrusel</div></SelectItem>
                <SelectItem value="reel"><div className="flex items-center gap-2"><Video className="w-4 h-4" />Reel</div></SelectItem>
                <SelectItem value="story"><div className="flex items-center gap-2"><Clock className="w-4 h-4" />Story</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Caption</Label>
              <Button variant="ghost" size="sm" onClick={generateCaption}>
                <Sparkles className="w-3 h-3 mr-1" />
                Generar con IA
              </Button>
            </div>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escribe tu caption..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Hashtags</Label>
              <Button variant="ghost" size="sm" onClick={generateHashtags}>
                <Sparkles className="w-3 h-3 mr-1" />
                Sugerir
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {hashtags.map(tag => (
                <Badge key={tag} variant="secondary" className="pr-1">
                  {tag}
                  <button onClick={() => removeHashtag(tag)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                placeholder="Añadir hashtag..."
                onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
              />
              <Button variant="outline" size="icon" onClick={addHashtag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <Button className="w-full bg-gradient-to-r from-primary to-ai">
            <Send className="w-4 h-4 mr-2" />
            Programar Publicación
          </Button>
        </CardContent>
      </Card>

      {/* Scheduled Posts */}
      <Card className="backdrop-blur-sm bg-white/60 border-white/20">
        <CardHeader>
          <CardTitle className="text-lg">Próximas Publicaciones</CardTitle>
          <CardDescription>Posts programados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedulePosts.map(post => (
            <div key={post.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                post.content_type === 'reel' ? 'bg-rose-100' :
                post.content_type === 'carousel' ? 'bg-blue-100' : 'bg-purple-100'
              }`}>
                {post.content_type === 'reel' ? <Video className="w-4 h-4 text-rose-600" /> :
                 <Image className="w-4 h-4 text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{post.caption}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(post.scheduled_at).toLocaleDateString('es-ES', {
                    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <Badge variant="outline" className="bg-ai/5 text-ai border-ai/20">
                {post.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
