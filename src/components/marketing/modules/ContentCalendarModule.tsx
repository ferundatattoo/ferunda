import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";

const platformColors: Record<string, string> = {
  instagram: "bg-pink-500/20 text-pink-500 border-pink-500/30",
  facebook: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  tiktok: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  twitter: "bg-sky-500/20 text-sky-500 border-sky-500/30",
};

// Mock scheduled posts
const mockPosts = [
  { id: "1", date: new Date(), platform: "instagram", title: "New tattoo showcase" },
  { id: "2", date: new Date(), platform: "tiktok", title: "Behind the scenes" },
  { id: "3", date: new Date(Date.now() + 86400000), platform: "facebook", title: "Client story" },
  { id: "4", date: new Date(Date.now() + 86400000 * 3), platform: "instagram", title: "Flash sale" },
  { id: "5", date: new Date(Date.now() + 86400000 * 5), platform: "twitter", title: "Industry tips" },
];

const ContentCalendarModule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getPostsForDate = (date: Date) => {
    return mockPosts.filter(post => 
      format(post.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const selectedDatePosts = selectedDate ? getPostsForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content Calendar</h1>
          <p className="text-muted-foreground">Schedule and manage your posts</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Post
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{format(currentDate, "MMMM yyyy")}</CardTitle>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month start */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {days.map(day => {
                const postsForDay = getPostsForDate(day);
                const isSelected = selectedDate && format(selectedDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square p-1 rounded-lg border transition-all
                      ${isToday(day) ? "border-primary bg-primary/5" : "border-transparent"}
                      ${isSelected ? "border-primary bg-primary/10" : ""}
                      ${!isSameMonth(day, currentDate) ? "opacity-30" : ""}
                      hover:bg-accent/50
                    `}
                  >
                    <div className="text-xs font-medium">{format(day, "d")}</div>
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {postsForDay.slice(0, 3).map(post => (
                        <div 
                          key={post.id} 
                          className={`w-1.5 h-1.5 rounded-full ${platformColors[post.platform]?.split(" ")[0] || "bg-primary"}`}
                        />
                      ))}
                      {postsForDay.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{postsForDay.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              selectedDatePosts.length > 0 ? (
                <div className="space-y-3">
                  {selectedDatePosts.map(post => (
                    <div 
                      key={post.id}
                      className="p-3 rounded-lg border border-border/50 bg-background/50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={platformColors[post.platform]}>
                          {post.platform}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{post.title}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No posts scheduled</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Post
                  </Button>
                </div>
              )
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                Click on a date to see scheduled posts
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContentCalendarModule;
