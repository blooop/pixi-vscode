import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as TOML from '@iarna/toml';

export class PixiTaskProvider implements vscode.TaskProvider {
    static TaskType = 'pixi';
    private taskCache: vscode.Task[] | undefined;

    constructor(private workspaceRoot: string) {}

    public async provideTasks(): Promise<vscode.Task[]> {
        if (this.taskCache) {
            return this.taskCache;
        }

        this.taskCache = await this.getTasks();
        return this.taskCache;
    }

    public resolveTask(task: vscode.Task): vscode.Task | undefined {
        const taskName = task.definition.task;
        if (taskName) {
            const definition = task.definition as PixiTaskDefinition;
            return this.createTask(taskName, definition.script);
        }
        return undefined;
    }

    private async getTasks(): Promise<vscode.Task[]> {
        const tasks: vscode.Task[] = [];
        const pyprojectPath = path.join(this.workspaceRoot, 'pyproject.toml');

        if (!fs.existsSync(pyprojectPath)) {
            return tasks;
        }

        try {
            const content = fs.readFileSync(pyprojectPath, 'utf8');
            const pyproject = TOML.parse(content);
            
            if (pyproject.tool?.pixi?.tasks) {
                for (const [taskName, script] of Object.entries(pyproject.tool.pixi.tasks)) {
                    tasks.push(this.createTask(taskName, script as string));
                }
            }
        } catch (e) {
            console.error('Error parsing pyproject.toml:', e);
        }

        return tasks;
    }

    private createTask(taskName: string, script: string): vscode.Task {
        const kind: PixiTaskDefinition = {
            type: PixiTaskProvider.TaskType,
            task: taskName,
            script: script
        };

        return new vscode.Task(
            kind,
            vscode.TaskScope.Workspace,
            taskName,
            'pixi',
            new vscode.ShellExecution(`pixi run ${taskName}`),
            []
        );
    }
}

interface PixiTaskDefinition extends vscode.TaskDefinition {
    task: string;
    script: string;
}
