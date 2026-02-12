import { useState, useEffect } from "react";
import { apiClient } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";
import { generateEd25519KeyPair, copyToClipboard } from "../utils/crypto.js";

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreatedAgent {
  passportId: string;
  name: string;
  email: string;
  publicKey: string;
  privateKey: string;
}

type ModalStep = 'form' | 'success';

export default function CreateAgentModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateAgentModalProps) {
  const { owner } = useAuth();
  const [step, setStep] = useState<ModalStep>('form');
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    ownerEmail: owner?.email || "",
  });
  const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Update owner email when auth changes
  useEffect(() => {
    if (owner?.email) {
      setFormData((prev) => ({ ...prev, ownerEmail: owner.email }));
    }
  }, [owner?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Generate Ed25519 key pair in browser
      const { publicKey, privateKey } = await generateEd25519KeyPair();

      // Send only public key to API
      const result = await apiClient.registerPassport({
        name: formData.name,
        description: formData.description || undefined,
        owner_email: formData.ownerEmail,
        public_key: publicKey,
      });

      // Show success screen with private key (one-time)
      setCreatedAgent({
        passportId: result.passport_id,
        name: formData.name,
        email: `${formData.name}@agent-mail.xyz`,
        publicKey,
        privateKey,
      });

      setStep('success');
      onSuccess(); // Trigger parent refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: "",
        description: "",
        ownerEmail: owner?.email || "",
      });
      setCreatedAgent(null);
      setError(null);
      setCopySuccess(null);
      setStep('form');
      onClose();
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await copyToClipboard(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy to clipboard");
    }
  };

  const downloadMcpConfig = (agent: CreatedAgent) => {
    const config = {
      mcpServers: {
        agentpass: {
          command: "node",
          args: ["path/to/AgentPass/packages/mcp-server/dist/cli.js", "serve"],
          env: {
            AGENTPASS_PRIVATE_KEY: agent.privateKey,
            AGENTPASS_PASSPORT_ID: agent.passportId,
          }
        }
      }
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentpass-${agent.name}-mcp-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {step === 'form' ? 'Create New Agent' : 'Agent Created Successfully'}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form Step */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Agent Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., web-scraper-01"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of what this agent does"
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="ownerEmail"
              className="block text-sm font-medium text-gray-700"
            >
              Owner Email
            </label>
            <input
              type="email"
              id="ownerEmail"
              required
              value={formData.ownerEmail}
              disabled
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Automatically set from your account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Creating...
                </span>
              ) : (
                "Create Agent"
              )}
            </button>
          </div>
        </form>
        )}

        {/* Success Step */}
        {step === 'success' && createdAgent && (
          <div>
            {/* Success Icon */}
            <div className="text-center mb-6">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                <svg
                  className="h-6 w-6 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Your agent passport has been created</p>
            </div>

            {/* Agent Info */}
            <div className="space-y-3 mb-6">
              <InfoRow
                label="Passport ID"
                value={createdAgent.passportId}
                onCopy={() => handleCopy(createdAgent.passportId, 'Passport ID')}
                copySuccess={copySuccess === 'Passport ID'}
              />
              <InfoRow
                label="Agent Email"
                value={createdAgent.email}
                onCopy={() => handleCopy(createdAgent.email, 'Agent Email')}
                copySuccess={copySuccess === 'Agent Email'}
              />
            </div>

            {/* Private Key Warning Section */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-50 p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="h-5 w-5 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <span className="font-semibold text-amber-900 text-sm">Save Your Private Key</span>
              </div>
              <p className="text-xs text-amber-800 mb-3">
                This key will NOT be shown again. It never leaves your browser.
                Save it securely — you'll need it to configure the MCP server.
              </p>
              <div className="relative">
                <pre className="bg-gray-900 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto break-all font-mono max-h-32 overflow-y-auto">
{createdAgent.privateKey}
                </pre>
                <button
                  onClick={() => handleCopy(createdAgent.privateKey, 'Private Key')}
                  className="absolute top-2 right-2 rounded px-2 py-1 text-xs font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  {copySuccess === 'Private Key' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Download MCP Config Button */}
            <button
              onClick={() => downloadMcpConfig(createdAgent)}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              Download MCP Config
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              Add this config to ~/.claude/settings.json to connect the agent to Claude Code.
            </p>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="w-full mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// InfoRow component for displaying key-value pairs with copy button
interface InfoRowProps {
  label: string;
  value: string;
  onCopy: () => void;
  copySuccess: boolean;
}

function InfoRow({ label, value, onCopy, copySuccess }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
        <p className="text-sm text-gray-900 font-mono truncate">{value}</p>
      </div>
      <button
        onClick={onCopy}
        className="ml-3 rounded px-2 py-1 text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        {copySuccess ? (
          <span className="flex items-center gap-1">
            <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Copied
          </span>
        ) : (
          'Copy'
        )}
      </button>
    </div>
  );
}
