
import React, { useState } from "react";
import { networkService } from "@/services/networkService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Download } from "lucide-react";

const ControlPanel: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);

  const toggleMonitoring = () => {
    if (isMonitoring) {
      networkService.stopMonitoring();
      setIsMonitoring(false);
      toast.info("Monitoring stopped");
    } else {
      networkService.startMonitoring();
      setIsMonitoring(true);
      toast.success("Monitoring started");
    }
  };

  const clearData = () => {
    networkService.clearData();
    toast.success("Data cleared");
  };

  const downloadData = () => {
    networkService.downloadCSV();
    toast.success("Download started");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <Button
            onClick={toggleMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
            className="w-full"
          >
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
          
          <Button
            onClick={clearData}
            variant="outline"
            className="w-full"
          >
            Clear Data
          </Button>
          
          <Button
            onClick={downloadData}
            variant="secondary"
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;
