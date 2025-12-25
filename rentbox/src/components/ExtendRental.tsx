import React, { useState } from 'react';
import { Button, Card } from './ui';
import { Booking } from '../types';

export const ExtendRentalModal = ({ booking, onClose }: { booking: Booking, onClose: () => void }) => {
    const [newEndAt, setNewEndAt] = useState('');
    const [loading, setLoading] = useState(false);
    const [quote, setQuote] = useState<{ amount: number, paymentIntent: string } | null>(null);
    const [error, setError] = useState('');

    const handleCheckExtension = async () => {
        setLoading(true);
        setError('');
        
        // Mock API call to POST /api/bookings/:id/extend
        try {
            // Simulate API latency
            await new Promise(r => setTimeout(r, 800));
            
            // Mock response logic
            const currentEnd = new Date(booking.end_at);
            const selectedEnd = new Date(newEndAt);
            
            if (selectedEnd <= currentEnd) {
                throw new Error("New time must be later");
            }
            
            // Simulate success quote
            setQuote({
                amount: 15.50,
                paymentIntent: 'pi_mock_ext'
            });
            
        } catch (e: any) {
            setError(e.message || "Extension not available for this time.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        // Here we would process payment with the intent
        alert(`Payment of €${quote?.amount} successful! Extension confirmed.`);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-sm p-6 bg-white shadow-xl">
                <h2 className="text-xl font-bold mb-4">Extend Rental</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Current end: {new Date(booking.end_at).toLocaleString()}
                </p>

                {!quote ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">New End Time</label>
                            <input 
                                type="datetime-local" 
                                className="w-full border rounded px-3 py-2"
                                value={newEndAt}
                                onChange={(e) => setNewEndAt(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-red-600 text-sm">{error}</p>}
                        <div className="flex gap-2 justify-end mt-6">
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleCheckExtension} disabled={loading || !newEndAt}>
                                {loading ? 'Checking...' : 'Check Availability'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                            Extension available! <br/>
                            Extra cost: <strong>€{quote.amount.toFixed(2)}</strong>
                        </div>
                        <div className="flex gap-2 justify-end mt-6">
                            <Button variant="outline" onClick={() => setQuote(null)}>Back</Button>
                            <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
                                Pay & Confirm
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};
