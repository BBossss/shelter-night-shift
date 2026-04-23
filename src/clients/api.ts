import type {
  AgentAction,
  AgentRole,
  AgentRoomView,
  PersonaProfile,
  PublicRoomView,
} from "../shared/types.js";

interface RegisterAgentResponse {
  agentId: string;
  secret: string;
}

export interface AgentIdentity extends RegisterAgentResponse {
  name: string;
  role: AgentRole;
  persona: PersonaProfile;
}

export class GameApiClient {
  constructor(private readonly baseUrl: string) {}

  async registerAgent(input: { name: string; role: AgentRole; persona: PersonaProfile }): Promise<AgentIdentity> {
    const result = await this.request<RegisterAgentResponse>("/api/agents/register", {
      method: "POST",
      body: input,
    });

    return {
      ...result,
      name: input.name,
      role: input.role,
      persona: input.persona,
    };
  }

  async joinAgent(agentId: string, secret: string): Promise<void> {
    await this.request(`/api/agents/${agentId}/join`, {
      method: "POST",
      body: { secret },
    });
  }

  async getAgentState(agentId: string, secret: string): Promise<AgentRoomView> {
    const query = new URLSearchParams({ secret });
    return this.request<AgentRoomView>(`/api/agents/${agentId}/state?${query.toString()}`);
  }

  async act(agentId: string, secret: string, action: AgentAction): Promise<void> {
    await this.request(`/api/agents/${agentId}/act`, {
      method: "POST",
      body: { secret, action },
    });
  }

  async chat(agentId: string, secret: string, text: string): Promise<void> {
    await this.request(`/api/agents/${agentId}/chat`, {
      method: "POST",
      body: { secret, text },
    });
  }

  async leave(agentId: string, secret: string): Promise<void> {
    await this.request(`/api/agents/${agentId}/leave`, {
      method: "POST",
      body: { secret },
    });
  }

  async getRoomState(): Promise<PublicRoomView> {
    return this.request<PublicRoomView>("/api/room");
  }

  private async request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
    const response = await fetch(new URL(path, this.baseUrl), {
      method: init?.method ?? "GET",
      headers: init?.body ? { "content-type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status} for ${path}: ${text || response.statusText}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
