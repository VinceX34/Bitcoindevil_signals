'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QueuedSignal {
  id: number;
  signal_id: number;
  status: string;
  created_at: string;
  process_after: string;
  attempts: number;
  response_message: string | null;
  signal_group: string;
}

const QueuedSignalsDisplay = () => {
  const [queuedSignals, setQueuedSignals] = useState<QueuedSignal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQueuedSignals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/queue');
      if (!response.ok) {
        throw new Error(`Failed to fetch queued signals: ${response.statusText}`);
      }
      const data = await response.json();
      setQueuedSignals(data.signals || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueuedSignals();
    const interval = setInterval(fetchQueuedSignals, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/queue?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete signal');
      }
      fetchQueuedSignals(); // Refresh the list
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTruncate = async () => {
    if (
      confirm(
        'Are you sure you want to delete ALL signals in the queue? This cannot be undone.',
      )
    ) {
      try {
        const response = await fetch('/api/queue', { method: 'DELETE' });
        if (!response.ok) {
          throw new Error('Failed to truncate queue');
        }
        fetchQueuedSignals(); // Refresh the list
      } catch (err: any) {
        setError(err.message);
      }
    }
  };
  
  const getGroupColor = (group: string) => {
    switch (group) {
      case 'btc':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'ai':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Queued Signals for Cryptohopper</CardTitle>
          <Button onClick={handleTruncate} variant="destructive" size="sm">
            Delete All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        <div className="space-y-4">
          {queuedSignals.length > 0 ? (
            queuedSignals.map((signal) => (
              <div
                key={signal.id}
                className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">ID: {signal.signal_id}</span>
                    <Badge className={getGroupColor(signal.signal_group)}>
                      {signal.signal_group.toUpperCase()}
                    </Badge>
                  </div>
                  <p>Status: {signal.status}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Queued at: {new Date(signal.created_at).toLocaleString()}
                  </p>
                  {signal.response_message && (
                    <p className="text-xs text-red-400">
                      {signal.response_message}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handleDelete(signal.id)}
                  variant="destructive"
                  size="sm"
                >
                  Delete
                </Button>
              </div>
            ))
          ) : (
            <p>No signals currently in the queue.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QueuedSignalsDisplay; 