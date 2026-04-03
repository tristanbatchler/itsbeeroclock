import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

/**
 * One-time stack that creates an IAM OIDC provider for GitHub Actions and a
 * role that the deploy workflow can assume. Deploy this once with:
 *
 *   cd infra/cdk && npx cdk deploy GitHubRoleStack
 *
 * Then copy the printed role ARN into .github/workflows/deploy.yml.
 */
export class GitHubRoleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repo = "tristanbatchler/itsbeeroclock";

    // GitHub's OIDC provider — only one can exist per account.
    // If you already have one, import it instead of creating a new one.
    const provider = new iam.OpenIdConnectProvider(this, "GitHubOidcProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    const role = new iam.Role(this, "GitHubActionsRole", {
      roleName: "GitHubActions-BeerOClock",
      assumedBy: new iam.WebIdentityPrincipal(
        provider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            // Allow any branch/tag/PR from this repo
            "token.actions.githubusercontent.com:sub": `repo:${repo}:*`,
          },
        },
      ),
      managedPolicies: [
        // AdministratorAccess is broad but CDK deploy needs it to create/update
        // arbitrary resources. Scope this down once the stack is stable.
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
      ],
      maxSessionDuration: cdk.Duration.hours(1),
    });

    new cdk.CfnOutput(this, "RoleArn", {
      value: role.roleArn,
      description: "Paste this ARN into .github/workflows/deploy.yml",
    });
  }
}
