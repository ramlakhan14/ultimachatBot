import React from "react";
import { Button, ButtonProps, useToast, Text } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import { checkCanCreateChatbot } from "../../services/knowledgebaseService";

interface CreateActionButtonProps {
  title: string;
  icon?: React.ReactElement;
  validated?: boolean;
  navigateTo?: string;
  /** API function to check permission */
  toastTitle?: string;
  toastDescription?: string;

  buttonProps?: ButtonProps;
}

const CustomButton: React.FC<CreateActionButtonProps> = ({
  title,
  icon,
  navigateTo,
  toastTitle = "Limit reached", validated,
  toastDescription = "You’ve reached your chatbot limit. Please upgrade your plan to create more chatbots.",
  buttonProps,
}) => {
  const toast = useToast();
  const history = useHistory();
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      const response: any = await checkCanCreateChatbot();
      const canCreate = response?.data?.data?.allowed;

      if (!canCreate) {
        toast({
          title: toastTitle,
          description: toastDescription,
          status: "warning",
          duration: 4000,
          isClosable: true,
        });
        return;
      }


      if (navigateTo) {
        history.push(navigateTo);
      }
    } catch (error: any) {
      // console.error("Permission check failed", error);
      toast({
        title: error?.response?.data?.message || error?.message + " Something went wrong",
        description: "Please try again later.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      colorScheme="blue"
      leftIcon={icon}
      onClick={handleClick}
      isLoading={loading}
      {...buttonProps}
      fontWeight={500}
    >
      {title}
    </Button>
  );
};

export default CustomButton;
