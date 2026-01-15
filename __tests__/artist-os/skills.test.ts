import { describe, it, expect } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";

const SKILLS_DIR = path.join(process.cwd(), "workspace-template", ".claude", "skills");

describe("Agent Skills Validation", () => {
  it("validates that all skill directories contain a valid SKILL.md", async () => {
    const skills = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    
    for (const skill of skills) {
      if (!skill.isDirectory()) continue;
      
      const skillPath = path.join(SKILLS_DIR, skill.name);
      const skillMdPath = path.join(skillPath, "SKILL.md");
      
      // 1. SKILL.md must exist
      const exists = await fs.access(skillMdPath).then(() => true).catch(() => false);
      expect(exists, `Skill ${skill.name} is missing SKILL.md`).toBe(true);
      
      const content = await fs.readFile(skillMdPath, "utf-8");
      
      // 2. Must contain YAML frontmatter
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      expect(match, `Skill ${skill.name} missing YAML frontmatter`).not.toBeNull();
      
      const yaml = match![1];
      
      // 3. Name in frontmatter must match directory name
      const nameMatch = yaml.match(/name:\s*(.+)/);
      expect(nameMatch, `Skill ${skill.name} missing 'name' in frontmatter`).not.toBeNull();
      expect(nameMatch![1].trim()).toBe(skill.name);
      
      // 4. Description must be present
      const descMatch = yaml.match(/description:\s*(.+)/);
      expect(descMatch, `Skill ${skill.name} missing 'description' in frontmatter`).not.toBeNull();
      expect(descMatch![1].trim().length).toBeGreaterThan(0);
    }
  });

  it("verifies CLAUDE.md instructs dynamic skill discovery", async () => {
    const claudeMdPath = path.join(process.cwd(), "workspace-template", "CLAUDE.md");
    const content = await fs.readFile(claudeMdPath, "utf-8");
    
    // CLAUDE.md should instruct agents to discover skills dynamically, not list them statically
    // Per Agent Skills best practices: only skill names and descriptions are loaded at startup
    // via progressive disclosure from .claude/skills/ directory
    
    // Must have skill discovery section
    expect(content).toContain("## Skill Discovery & Usage");
    
    // Must reference the skills directory for dynamic discovery
    expect(content).toContain(".claude/skills/");
    
    // Must instruct reading SKILL.md files
    expect(content).toContain("SKILL.md");
    
    // Verify skills are actually discoverable on disk
    const diskSkills = (await fs.readdir(SKILLS_DIR, { withFileTypes: true }))
      .filter(d => d.isDirectory())
      .map(d => d.name);
    
    // Should have at least some skills for dynamic discovery
    expect(diskSkills.length).toBeGreaterThan(0);
  });
});
