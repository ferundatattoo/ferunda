import WaitlistManager from "@/components/admin/WaitlistManager";

const Waitlist = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Waitlist</h1>
        <p className="font-body text-muted-foreground mt-1">
          Gestión inteligente de lista de espera con ofertas automáticas
        </p>
      </div>
      
      <WaitlistManager />
    </div>
  );
};

export default Waitlist;
