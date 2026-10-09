import { Redirect } from "react-router-dom";

const EligibilityGuard = ({
  component: Component,
  checkUserEligibility,
}: any) => {
  if (checkUserEligibility) {
    return <Redirect to="/app/myprofile" />
  } else {
    return Component
  }
};

export default EligibilityGuard;
