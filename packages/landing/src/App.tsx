function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
            <svg
              className="h-5 w-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">AgentPass</span>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#how-it-works"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            For Agents
          </a>
          <a
            href="#for-services"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            For Services
          </a>
          <a
            href="#for-owners"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            For Owners
          </a>
          <a
            href="#quick-start"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            Docs
          </a>
        </nav>

        <a
          href="#quick-start"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
        >
          Get Started
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gray-950 pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
        <div className="absolute top-20 right-1/4 h-[400px] w-[600px] rounded-full bg-cyan-500/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 mb-8">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Auth0 for AI Agents
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Give Your AI Agents a{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            Passport to the Internet
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-300 sm:text-xl">
          The cryptographic identity layer for autonomous AI agents. One passport, any service. Instant authentication, encrypted credentials, full owner control.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://github.com/romirom11/AgentPass"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105"
          >
            View on GitHub
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
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </a>
          <a
            href="#quick-start"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-700 bg-gray-800/50 backdrop-blur-sm px-8 py-4 text-base font-semibold text-gray-200 transition-all hover:border-gray-500 hover:bg-gray-800 hover:text-white"
          >
            Quick Start
          </a>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Ed25519 cryptography
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            AES-256-GCM encryption
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
            Open source
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="bg-gray-900 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 mb-6">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            The Problem
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            AI Agents Can't Access the Internet
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-300">
            AI agents need to authenticate on services but have <span className="text-white font-semibold">no identity</span>.
            They can't sign up for accounts, verify email addresses, handle
            CAPTCHAs, or manage passwords. Every agent reinvents the wheel — fragile browser scripts, hardcoded credentials, zero security.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-gray-300">
            Meanwhile, owners have <span className="text-white font-semibold">no visibility</span> into what their agents are
            doing. No audit trail. No way to revoke access. No control.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "No Identity",
              description:
                "Agents have no standardized way to prove who they are to internet services.",
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              ),
            },
            {
              title: "No Security",
              description:
                "Credentials stored in plaintext, shared across agents, impossible to audit or revoke.",
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              ),
            },
            {
              title: "No Control",
              description:
                "Owners can't see what agents do, approve risky actions, or shut things down.",
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              ),
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 hover:border-red-500/50 transition-colors group"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  {item.icon}
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CodeExample() {
  return (
    <section className="bg-gray-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Simple for Agents, Powerful for Owners
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            One function call to authenticate anywhere. Real code from AgentPass MCP tools.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Agent perspective */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Agent Usage</h3>
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-800/80 backdrop-blur p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-gray-500">agent.py</span>
              </div>
              <pre className="overflow-x-auto text-sm leading-relaxed">
                <code>
                  <span className="text-purple-400">from</span>
                  <span className="text-gray-300"> mcp </span>
                  <span className="text-purple-400">import</span>
                  <span className="text-gray-300"> AgentPassClient</span>
                  {"\n\n"}
                  <span className="text-gray-500">{"# Create agent identity"}</span>
                  {"\n"}
                  <span className="text-white">passport</span>
                  <span className="text-gray-300"> = </span>
                  <span className="text-purple-400">await</span>
                  <span className="text-gray-300"> client.</span>
                  <span className="text-yellow-300">create_identity</span>
                  <span className="text-gray-300">(</span>
                  {"\n"}
                  <span className="text-gray-300">{"  "}</span>
                  <span className="text-white">agent_name</span>
                  <span className="text-gray-300">=</span>
                  <span className="text-emerald-300">"research-assistant"</span>
                  {"\n"}
                  <span className="text-gray-300">)</span>
                  {"\n\n"}
                  <span className="text-gray-500">{"# Authenticate on any service"}</span>
                  {"\n"}
                  <span className="text-white">session</span>
                  <span className="text-gray-300"> = </span>
                  <span className="text-purple-400">await</span>
                  <span className="text-gray-300"> client.</span>
                  <span className="text-yellow-300">authenticate</span>
                  <span className="text-gray-300">(</span>
                  {"\n"}
                  <span className="text-gray-300">{"  "}</span>
                  <span className="text-white">identity_id</span>
                  <span className="text-gray-300">=</span>
                  <span className="text-white">passport</span>
                  <span className="text-gray-300">.</span>
                  <span className="text-white">id</span>
                  <span className="text-gray-300">,</span>
                  {"\n"}
                  <span className="text-gray-300">{"  "}</span>
                  <span className="text-white">service_url</span>
                  <span className="text-gray-300">=</span>
                  <span className="text-emerald-300">"github.com"</span>
                  {"\n"}
                  <span className="text-gray-300">)</span>
                  {"\n\n"}
                  <span className="text-gray-500">{"# Done! Credentials stored,"}</span>
                  {"\n"}
                  <span className="text-gray-500">{"# session active, owner notified."}</span>
                </code>
              </pre>
            </div>
          </div>

          {/* Service perspective */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Service Integration</h3>
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-800/80 backdrop-blur p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-gray-500">server.ts</span>
              </div>
              <pre className="overflow-x-auto text-sm leading-relaxed">
                <code>
                  <span className="text-purple-400">import</span>
                  <span className="text-gray-300"> {"{ AgentPass }"} </span>
                  <span className="text-purple-400">from</span>
                  <span className="text-emerald-300"> '@agentpass/sdk'</span>
                  <span className="text-gray-500">;</span>
                  {"\n\n"}
                  <span className="text-purple-400">const</span>
                  <span className="text-gray-300"> ap </span>
                  <span className="text-purple-400">=</span>
                  <span className="text-purple-400"> new</span>
                  <span className="text-cyan-300"> AgentPass</span>
                  <span className="text-gray-300">{"({"}</span>
                  {"\n"}
                  <span className="text-gray-300">{"  "}</span>
                  <span className="text-white">serviceId</span>
                  <span className="text-gray-300">: </span>
                  <span className="text-emerald-300">"your-service"</span>
                  <span className="text-gray-300">,</span>
                  {"\n"}
                  <span className="text-gray-300">{"  "}</span>
                  <span className="text-white">apiKey</span>
                  <span className="text-gray-300">: </span>
                  <span className="text-white">process</span>
                  <span className="text-gray-300">.</span>
                  <span className="text-white">env</span>
                  <span className="text-gray-300">.</span>
                  <span className="text-white">AGENTPASS_KEY</span>
                  {"\n"}
                  <span className="text-gray-300">{"});"}</span>
                  {"\n\n"}
                  <span className="text-gray-500">{"// Verify agent auth"}</span>
                  {"\n"}
                  <span className="text-purple-400">const</span>
                  <span className="text-gray-300"> agent </span>
                  <span className="text-purple-400">=</span>
                  <span className="text-purple-400"> await</span>
                  <span className="text-gray-300"> ap.</span>
                  <span className="text-yellow-300">verify</span>
                  <span className="text-gray-300">(</span>
                  {"\n"}
                  <span className="text-gray-300">{"  "}</span>
                  <span className="text-white">req</span>
                  <span className="text-gray-300">.</span>
                  <span className="text-white">headers</span>
                  <span className="text-gray-300">.</span>
                  <span className="text-white">authorization</span>
                  {"\n"}
                  <span className="text-gray-300">);</span>
                  {"\n\n"}
                  <span className="text-gray-500">{"// Check trust score"}</span>
                  {"\n"}
                  <span className="text-purple-400">if</span>
                  <span className="text-gray-300"> (agent.</span>
                  <span className="text-white">trustScore</span>
                  <span className="text-gray-300"> {">"} </span>
                  <span className="text-orange-300">80</span>
                  <span className="text-gray-300">) {"{"}</span>
                  {"\n"}
                  <span className="text-gray-300">{"  "}</span>
                  <span className="text-purple-400">return</span>
                  <span className="text-gray-300"> </span>
                  <span className="text-yellow-300">grantAccess</span>
                  <span className="text-gray-300">(agent);</span>
                  {"\n"}
                  <span className="text-gray-300">{"}"}</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Get a Passport",
      description:
        "Agent receives an Ed25519 key pair and unique email address. One command: create_identity(). Instant cryptographic identity.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
        />
      ),
    },
    {
      step: "02",
      title: "Authenticate Anywhere",
      description:
        "Agent calls authenticate(url). Native auth if the service supports AgentPass, automatic browser-based registration if not. Email verification handled seamlessly.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        />
      ),
    },
    {
      step: "03",
      title: "Credentials Stored Securely",
      description:
        "All passwords and tokens encrypted with AES-256-GCM in a local vault. Private key never leaves the machine. Revoke any agent instantly.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      ),
    },
  ];

  return (
    <section id="how-it-works" className="bg-gray-900 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Three steps to give your agent a verifiable identity.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {steps.map((item, idx) => (
            <div key={item.step} className="relative">
              {idx < 2 && (
                <div className="hidden lg:block absolute top-1/2 left-full w-8 h-0.5 bg-gradient-to-r from-emerald-500/50 to-transparent -translate-y-1/2" />
              )}
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 hover:border-emerald-500/50 transition-colors">
                <span className="text-sm font-bold text-emerald-400">
                  {item.step}
                </span>
                <div className="mt-4 mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                  <svg
                    className="h-6 w-6 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    {item.icon}
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForServices() {
  return (
    <section id="for-services" className="bg-gray-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 mb-6">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
            </svg>
            For Services
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Add "Login with AgentPass" to Your Service
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            As simple as OAuth. Three steps to enable AI agent authentication.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {/* Steps */}
          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "Install the SDK",
                code: "npm install @agentpass/sdk",
                color: "cyan",
              },
              {
                step: "2",
                title: "Add Discovery Endpoint",
                code: "GET /.well-known/agentpass.json",
                color: "indigo",
              },
              {
                step: "3",
                title: "Verify Agent Signatures",
                code: "await agentpass.verify(request)",
                color: "emerald",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 group">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-${item.color}-500/20 text-sm font-bold text-${item.color}-400 group-hover:bg-${item.color}-500/30 transition-colors`}>
                  {item.step}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <code className="block rounded-lg bg-gray-800/80 border border-gray-700 px-4 py-3 text-sm text-cyan-300 font-mono">
                    {item.code}
                  </code>
                </div>
              </div>
            ))}

            <div className="mt-8 pt-8 border-t border-gray-800">
              <h4 className="text-sm font-semibold text-white mb-4">Benefits</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Instant agent onboarding",
                  "Trust score integration",
                  "Abuse reporting API",
                  "Zero friction for agents",
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 shrink-0 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    <span className="text-sm text-gray-400">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Code block */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/80 backdrop-blur p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-gray-500">middleware.ts</span>
            </div>
            <pre className="overflow-x-auto text-sm leading-relaxed">
              <code>
                <span className="text-purple-400">import</span>
                <span className="text-gray-300">{" { "}</span>
                <span className="text-cyan-300">AgentPass</span>
                <span className="text-gray-300">{" } "}</span>
                <span className="text-purple-400">from</span>
                <span className="text-emerald-300">
                  {" '@agentpass/sdk'"}
                </span>
                <span className="text-gray-500">;</span>
                {"\n\n"}
                <span className="text-purple-400">const</span>
                <span className="text-gray-300"> ap </span>
                <span className="text-purple-400">=</span>
                <span className="text-purple-400"> new</span>
                <span className="text-cyan-300"> AgentPass</span>
                <span className="text-gray-300">{"({"}</span>
                {"\n"}
                <span className="text-gray-300">{"  "}</span>
                <span className="text-white">serviceId</span>
                <span className="text-gray-300">: </span>
                <span className="text-emerald-300">"your-service"</span>
                <span className="text-gray-300">,</span>
                {"\n"}
                <span className="text-gray-300">{"  "}</span>
                <span className="text-white">apiUrl</span>
                <span className="text-gray-300">: </span>
                <span className="text-emerald-300">
                  {"'https://api.agentpass.space'"}
                </span>
                {"\n"}
                <span className="text-gray-300">{"});"}</span>
                {"\n\n"}
                <span className="text-gray-500">
                  {"// Verify agent identity"}
                </span>
                {"\n"}
                <span className="text-purple-400">export</span>
                <span className="text-gray-300"> </span>
                <span className="text-purple-400">async</span>
                <span className="text-gray-300"> </span>
                <span className="text-purple-400">function</span>
                <span className="text-gray-300"> </span>
                <span className="text-yellow-300">authMiddleware</span>
                <span className="text-gray-300">(req) {"{"}</span>
                {"\n"}
                <span className="text-gray-300">{"  "}</span>
                <span className="text-purple-400">const</span>
                <span className="text-gray-300"> agent </span>
                <span className="text-purple-400">=</span>
                <span className="text-purple-400"> await</span>
                <span className="text-gray-300"> ap.</span>
                <span className="text-yellow-300">verify</span>
                <span className="text-gray-300">(req);</span>
                {"\n\n"}
                <span className="text-gray-300">{"  "}</span>
                <span className="text-gray-500">
                  {"// Check trust score"}
                </span>
                {"\n"}
                <span className="text-gray-300">{"  "}</span>
                <span className="text-purple-400">if</span>
                <span className="text-gray-300"> (agent.</span>
                <span className="text-white">trustScore</span>
                <span className="text-gray-300"> {"<"} </span>
                <span className="text-orange-300">80</span>
                <span className="text-gray-300">) {"{"}</span>
                {"\n"}
                <span className="text-gray-300">{"    "}</span>
                <span className="text-purple-400">throw</span>
                <span className="text-gray-300"> </span>
                <span className="text-purple-400">new</span>
                <span className="text-gray-300"> </span>
                <span className="text-cyan-300">Error</span>
                <span className="text-gray-300">(</span>
                <span className="text-emerald-300">"Low trust"</span>
                <span className="text-gray-300">);</span>
                {"\n"}
                <span className="text-gray-300">{"  }"}</span>
                {"\n\n"}
                <span className="text-gray-300">{"  "}</span>
                <span className="text-purple-400">return</span>
                <span className="text-gray-300"> agent;</span>
                {"\n"}
                <span className="text-gray-300">{"}"}</span>
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function ForOwners() {
  const features = [
    {
      title: "Live Dashboard",
      description:
        "See every action in real-time. Which services, when, what happened.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
        />
      ),
    },
    {
      title: "Approval Flow",
      description:
        "Set which actions need your OK. Auto-approve trusted domains, block risky ones.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    {
      title: "CAPTCHA Solving",
      description:
        "When agents hit CAPTCHAs, you get a notification. Solve from your phone via Telegram.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.491 48.491 0 01-4.163-.3c.186 1.613.93 3.084 2.146 4.23M14.25 6.087c0 .662.126 1.293.35 1.877M14.25 6.087a2.25 2.25 0 002.193 1.77A2.252 2.252 0 0118 6.75h.75m-14.25 0h-.75a.75.75 0 00-.75.75v7.5a2.25 2.25 0 002.25 2.25h1.372c.516 0 .966-.351 1.091-.852l1.106-4.422c.084-.336.527-.336.611 0l1.106 4.422c.125.501.575.852 1.091.852H15a2.25 2.25 0 002.25-2.25V7.5a.75.75 0 00-.75-.75h-.75"
        />
      ),
    },
    {
      title: "Credential Vault",
      description:
        "All passwords encrypted. You control access. Revoke any agent instantly.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33"
        />
      ),
    },
    {
      title: "Webhook Alerts",
      description:
        "Get notified on Telegram, Slack, or any webhook. Every registration, login, error.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      ),
    },
    {
      title: "Trust Scores",
      description:
        "Each agent builds reputation. Services use it for authorization decisions.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      ),
    },
  ];

  return (
    <section id="for-owners" className="bg-gray-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Full Control Over Your Agents
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            A real-time command center for everything your agents do.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-700 bg-gray-800/50 p-6 transition-colors hover:border-gray-600"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <svg
                  className="h-5 w-5 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  {feature.icon}
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Architecture() {
  return (
    <section className="bg-gray-900 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Built for Security
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Zero-trust architecture. Your agent's private key never leaves its
            machine.
          </p>
        </div>

        {/* Architecture diagram */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Agent (Local) */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                <svg
                  className="h-6 w-6 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-white">AI Agent</h3>
              <p className="mt-1 text-xs text-gray-400">
                Local machine
              </p>
              <div className="mt-3 space-y-1">
                <div className="rounded bg-gray-800/80 px-2 py-1 text-xs text-gray-300">
                  Private Key
                </div>
                <div className="rounded bg-gray-800/80 px-2 py-1 text-xs text-gray-300">
                  Credential Vault
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className="hidden sm:block">
                <svg
                  className="h-8 w-full text-gray-600"
                  fill="none"
                  viewBox="0 0 200 32"
                >
                  <path
                    d="M0 16h180m0 0l-8-8m8 8l-8 8"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-1 text-center text-xs text-gray-500">
                  Signed requests
                </p>
                <svg
                  className="mt-2 h-8 w-full text-gray-600"
                  fill="none"
                  viewBox="0 0 200 32"
                >
                  <path
                    d="M200 16H20m0 0l8-8m-8 8l8 8"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-1 text-center text-xs text-gray-500">
                  Challenges
                </p>
              </div>
              <div className="sm:hidden">
                <svg
                  className="mx-auto h-12 w-8 text-gray-600"
                  fill="none"
                  viewBox="0 0 32 48"
                >
                  <path
                    d="M16 0v40m0 0l-8-8m8 8l8-8"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* API Server (Remote) */}
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20">
                <svg
                  className="h-6 w-6 text-cyan-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-white">API Server</h3>
              <p className="mt-1 text-xs text-gray-400">
                Remote (Hono)
              </p>
              <div className="mt-3 space-y-1">
                <div className="rounded bg-gray-800/80 px-2 py-1 text-xs text-gray-300">
                  Public Keys
                </div>
                <div className="rounded bg-gray-800/80 px-2 py-1 text-xs text-gray-300">
                  Audit Log
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key security points */}
        <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Private keys NEVER leave the agent's machine",
            "Credentials encrypted at rest with AES-256-GCM",
            "Challenge-response auth with Ed25519",
            "Revoke any agent instantly",
          ].map((point) => (
            <div
              key={point}
              className="flex items-start gap-2 rounded-lg border border-gray-700 bg-gray-800/50 p-4"
            >
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              <span className="text-sm text-gray-300">{point}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function McpTools() {
  const categories = [
    {
      name: "Identity",
      color: "emerald",
      tools: ["create_identity", "list_identities", "get_identity"],
    },
    {
      name: "Auth",
      color: "cyan",
      tools: ["authenticate", "check_auth_status"],
    },
    {
      name: "Email",
      color: "purple",
      tools: [
        "get_email_address",
        "wait_for_email",
        "extract_verification_link",
        "extract_otp_code",
      ],
    },
    {
      name: "SMS",
      color: "orange",
      tools: ["get_phone_number", "wait_for_sms", "extract_otp_from_sms"],
    },
    {
      name: "Credentials",
      color: "pink",
      tools: ["store_credential", "get_credential", "list_credentials"],
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; badge: string }> =
    {
      emerald: {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        badge: "bg-emerald-500/20 text-emerald-300",
      },
      cyan: {
        bg: "bg-cyan-500/10",
        text: "text-cyan-400",
        badge: "bg-cyan-500/20 text-cyan-300",
      },
      purple: {
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        badge: "bg-purple-500/20 text-purple-300",
      },
      orange: {
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        badge: "bg-orange-500/20 text-orange-300",
      },
      pink: {
        bg: "bg-pink-500/10",
        text: "text-pink-400",
        badge: "bg-pink-500/20 text-pink-300",
      },
    };

  return (
    <section className="bg-gray-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            17 MCP Tools, One Integration
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Everything an agent needs to establish identity, authenticate, and
            manage credentials.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const colors = colorMap[category.color];
            return (
              <div
                key={category.name}
                className="rounded-xl border border-gray-700 bg-gray-800/50 p-6"
              >
                <div
                  className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-medium ${colors.badge}`}
                >
                  {category.name}
                </div>
                <div className="space-y-2">
                  {category.tools.map((tool) => (
                    <div
                      key={tool}
                      className={`flex items-center gap-2 rounded-lg ${colors.bg} px-3 py-2`}
                    >
                      <svg
                        className={`h-3.5 w-3.5 ${colors.text}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
                        />
                      </svg>
                      <code className={`text-sm ${colors.text}`}>{tool}</code>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section id="quick-start" className="relative bg-gray-900 py-20 sm:py-28 overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[500px] rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute top-0 right-1/4 h-[300px] w-[500px] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 mb-6">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            Quick Start
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Get Started in Under 60 Seconds
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Clone, install, run. Your first agent passport ready in under a minute.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <div className="rounded-xl border border-gray-700 bg-gray-800/80 backdrop-blur p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-gray-500">terminal</span>
            </div>
            <pre className="overflow-x-auto text-sm leading-loose">
              <code>
                <span className="text-gray-500">{"# Clone the repository"}</span>
                {"\n"}
                <span className="text-emerald-400">$</span>
                <span className="text-gray-300">
                  {" git clone https://github.com/romirom11/AgentPass"}
                </span>
                {"\n"}
                <span className="text-emerald-400">$</span>
                <span className="text-gray-300">
                  {" cd AgentPass"}
                </span>
                {"\n\n"}
                <span className="text-gray-500">{"# Install dependencies"}</span>
                {"\n"}
                <span className="text-emerald-400">$</span>
                <span className="text-gray-300">{" pnpm install"}</span>
                {"\n\n"}
                <span className="text-gray-500">{"# Build all packages"}</span>
                {"\n"}
                <span className="text-emerald-400">$</span>
                <span className="text-gray-300">{" pnpm build"}</span>
                {"\n\n"}
                <span className="text-gray-500">
                  {"# Start the MCP server"}
                </span>
                {"\n"}
                <span className="text-emerald-400">$</span>
                <span className="text-gray-300">
                  {" node packages/mcp-server/dist/index.js"}
                </span>
                {"\n\n"}
                <span className="text-gray-500">
                  {"# 🎉 Agent can now create passports!"}
                </span>
              </code>
            </pre>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href="https://github.com/romirom11/AgentPass"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Star on GitHub
            </a>
            <a
              href="https://github.com/romirom11/AgentPass#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-700 bg-gray-800/50 backdrop-blur-sm px-6 py-3 text-sm font-semibold text-gray-200 transition-all hover:border-gray-500 hover:bg-gray-800 hover:text-white"
            >
              Read the Docs
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
              <svg
                className="h-4 w-4 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">AgentPass</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6">
            <a
              href="https://github.com/romirom11/AgentPass"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 transition-colors hover:text-white flex items-center gap-1"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>
            <a
              href="#quick-start"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Quick Start
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Documentation
            </a>
            <a
              href="#for-services"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              SDK
            </a>
          </nav>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10">
            <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <span className="text-sm text-indigo-300">Built for Anthropic Build-a-thon 2025</span>
          </div>
          <p className="text-xs text-gray-500">
            Built with Ed25519, Hono, Playwright, React, and TypeScript
          </p>
          <p className="mt-2 text-xs text-gray-600">MIT License &copy; 2025</p>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white antialiased">
      <Header />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <CodeExample />
        <ForServices />
        <ForOwners />
        <Architecture />
        <McpTools />
        <QuickStart />
      </main>
      <Footer />
    </div>
  );
}
