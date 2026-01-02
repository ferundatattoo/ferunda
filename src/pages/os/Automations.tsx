import { WorkflowBuilderHub } from "@/components/admin/workflow-engine";

const Automations = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Automatizaciones</h1>
        <p className="font-body text-muted-foreground mt-1">
          Workflows y automatizaciones para tu studio
        </p>
      </div>
      
      <WorkflowBuilderHub />
    </div>
  );
};

export default Automations;
