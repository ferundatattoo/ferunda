-- Enable realtime for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Enable realtime for booking_activities table
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_activities;