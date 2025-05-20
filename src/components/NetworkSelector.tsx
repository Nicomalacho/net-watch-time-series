
import React, { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { networkService } from "@/services/networkService";
import { Network, WifiHigh } from "lucide-react";

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
    </Card>
  );
};

export default NetworkSelector;
