import { Box, Image, Tooltip } from "@chakra-ui/react";
import React from "react";


interface ButtonGroupsDAProps {
  deleteHandler?: () => void;
  addHandler?: () => void;
  deleteDisabled?: boolean;
  addDisabled?: boolean;
  style?: React.CSSProperties;
}
export const ButtonGroupsDA: React.FC<ButtonGroupsDAProps> = ({
  deleteHandler,
  addHandler,
  deleteDisabled,
  addDisabled,
  style
}) => {
  return (

    <Box display="flex"
      sx={{
        pt: "35px",
        gap: "15px",
        px: "15px",
        ...(style || {}),
      }}
    >
      {
        deleteHandler &&
        <Tooltip label="Delete Row" fontSize={"11px"}>
          <Box
            as="button"
            type="button"
            disabled={deleteDisabled}
            onClick={deleteHandler}
            display="flex"
            alignItems="center"
            justifyContent="center"
            h="35px"
            w="35px"
            p="0"
            border="none"
            bg="transparent"
            _disabled={{ opacity: 0.4, cursor: "not-allowed" }}
          >
            <Image src={"/icons/delete2.svg"} alt="deleteicon" h="16px" />
          </Box>
        </Tooltip>
      }
      {
        addHandler &&
        <Tooltip label="Add New Row" fontSize={"11px"}>
          <Box
            as="button"
            type="button"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              h: "32px",
              w: "32px",
              padding: '7px',
              bg: "#6C757D",
              color: "#fff",
              borderRadius: "50% !important",
            }}
            _disabled={{ opacity: 0.4, cursor: "not-allowed" }}
            onClick={addHandler}
            disabled={addDisabled}
          // mt="2"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M21 12C21 12.1989 20.921 12.3897 20.7803 12.5303C20.6397 12.671 20.4489 12.75 20.25 12.75H12.75V20.25C12.75 20.4489 12.671 20.6397 12.5303 20.7803C12.3897 20.921 12.1989 21 12 21C11.8011 21 11.6103 20.921 11.4697 20.7803C11.329 20.6397 11.25 20.4489 11.25 20.25V12.75H3.75C3.55109 12.75 3.36032 12.671 3.21967 12.5303C3.07902 12.3897 3 12.1989 3 12C3 11.8011 3.07902 11.6103 3.21967 11.4697C3.36032 11.329 3.55109 11.25 3.75 11.25H11.25V3.75C11.25 3.55109 11.329 3.36032 11.4697 3.21967C11.6103 3.07902 11.8011 3 12 3C12.1989 3 12.3897 3.07902 12.5303 3.21967C12.671 3.36032 12.75 3.55109 12.75 3.75V11.25H20.25C20.4489 11.25 20.6397 11.329 20.7803 11.4697C20.921 11.6103 21 11.8011 21 12Z" fill="#ffffff" />
            </svg>

          </Box>
        </Tooltip>
      }
    </Box>
  );

};