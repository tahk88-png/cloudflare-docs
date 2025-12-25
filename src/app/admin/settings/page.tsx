import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Need to create Label

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Business Rules</CardTitle>
          <CardDescription>Configure global default settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="slot">Default Slot Minutes</Label>
            <Input type="number" id="slot" defaultValue="15" />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
             <Label htmlFor="min_rental">Default Min Rental Minutes</Label>
             <Input type="number" id="min_rental" defaultValue="60" />
          </div>
           <Button>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
