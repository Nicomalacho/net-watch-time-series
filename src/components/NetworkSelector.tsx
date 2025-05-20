
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { networkService } from "@/services/networkService";
import { Network, WifiHigh, ChartLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NetworkSelectorProps {
  selectedNetwork: string | undefined;
  onNetworkChange: (network: string | undefined) => void;
}

const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  selectedNetwork,
  onNetworkChange
}) => {
  const [networks, setNetworks] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNetworks(networkService.getNetworks());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <WifiHigh className="h-4 w-4" />
          Network
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          value={selectedNetwork || ""}
          onValueChange={(value) => onNetworkChange(value === "all" ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select network" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Networks</SelectItem>
            {networks.map((network) => (
              <SelectItem key={network} value={network}>
                {network}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-2 text-xs text-muted-foreground">
          {networks.length === 0 ? (
            "No networks detected yet. Start monitoring to detect networks."
          ) : (
            `${networks.length} network${networks.length !== 1 ? 's' : ''} detected`
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="secondary" size="sm" className="w-full" asChild>
          <Link to="/history" className="flex items-center justify-center gap-2">
            <ChartLine className="h-4 w-4" /> View Historical Metrics
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NetworkSelector;
