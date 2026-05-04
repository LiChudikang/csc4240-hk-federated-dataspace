/*
 *  Copyright (c) 2026 CSC4240 Final Project Team
 *
 *  This program and the accompanying materials are made available under the
 *  terms of the Apache License, Version 2.0 which is available at
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

package org.eclipse.edc.demo.dcp.policy;

import org.eclipse.edc.participant.spi.ParticipantAgentPolicyContext;
import org.eclipse.edc.policy.engine.spi.AtomicConstraintRuleFunction;
import org.eclipse.edc.policy.model.Operator;
import org.eclipse.edc.policy.model.Permission;

import java.util.Objects;

/**
 * Custom ODRL constraint added by the CSC4240 final project team.
 *
 * <p>Reads a {@code participantTier} claim from the holder's MembershipCredential
 * (a VC issued and signed by the dataspace issuer) and compares it to the
 * right operand of the constraint.
 *
 * <p>Example policy:
 * <pre>
 *   "permission": [{"action":"use",
 *      "constraint":{"leftOperand":"ParticipantTier","operator":"eq","rightOperand":"ACADEMIC"}}]
 * </pre>
 *
 * <p>The tier is sourced from issuer-attested data, not from the syntactic
 * shape of the participant's DID. Tampering would invalidate the JWT
 * signature, and the credential is rejected before this function ever runs.
 */
public class ParticipantTierFunction<C extends ParticipantAgentPolicyContext>
        extends AbstractCredentialEvaluationFunction
        implements AtomicConstraintRuleFunction<Permission, C> {

    public static final String CONSTRAINT_KEY = "ParticipantTier";

    private static final String MEMBERSHIP_CREDENTIAL_TYPE = "MembershipCredential";
    private static final String TIER_CLAIM = "participantTier";

    private ParticipantTierFunction() {
    }

    public static <C extends ParticipantAgentPolicyContext> ParticipantTierFunction<C> create() {
        return new ParticipantTierFunction<>() {
        };
    }

    @Override
    public boolean evaluate(Operator operator, Object rightOperand, Permission permission, C policyContext) {
        if (!operator.equals(Operator.EQ)) {
            policyContext.reportProblem(
                    "Cannot evaluate operator %s for ParticipantTier; only EQ is supported".formatted(operator));
            return false;
        }
        if (rightOperand == null) {
            policyContext.reportProblem("ParticipantTier rightOperand must not be null");
            return false;
        }

        var pa = policyContext.participantAgent();
        if (pa == null) {
            policyContext.reportProblem("ParticipantAgent not found on PolicyContext");
            return false;
        }

        var credentialResult = getCredentialList(pa);
        if (credentialResult.failed()) {
            policyContext.reportProblem(credentialResult.getFailureDetail());
            return false;
        }

        var expected = rightOperand.toString();

        return credentialResult.getContent().stream()
                .filter(vc -> vc.getType().stream().anyMatch(t -> t.endsWith(MEMBERSHIP_CREDENTIAL_TYPE)))
                .flatMap(vc -> vc.getCredentialSubject().stream())
                .map(cs -> cs.getClaim(MVD_NAMESPACE, TIER_CLAIM))
                .filter(Objects::nonNull)
                .map(Object::toString)
                .anyMatch(actual -> actual.equalsIgnoreCase(expected));
    }
}
