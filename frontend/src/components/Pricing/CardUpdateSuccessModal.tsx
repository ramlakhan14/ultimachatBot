import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  VStack,
  Box,
  Icon,
  Heading,
  Text,
  Button,
} from '@chakra-ui/react';
import { CheckCircleIcon } from '@phosphor-icons/react';

interface CardUpdateSuccessModalProps {
  isOpen: boolean;
  seconds?: number;
  onContinue: () => void;
  message?: string;
  // True once the actual upgrade API call has resolved (success or failure).
  // The countdown below is just a visual "roughly how long this takes"
  // indicator — the real close/redirect trigger is this flag, so a fast
  // response closes the modal right away instead of sitting through the
  // rest of the timer, while a slow one keeps the modal up past 10s rather
  // than redirecting before we actually know the outcome.
  ready: boolean;
}

const BRAND_BLUE = '#2977FF';

const CardUpdateSuccessModal: React.FC<CardUpdateSuccessModalProps> = ({
  isOpen,
  seconds = 10,
  onContinue,
  message = 'Your payment method has been updated successfully.',
  ready,
}) => {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    firedRef.current = false;
    setRemaining(seconds);
    const interval = setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, seconds]);

  // Close as soon as the upgrade call comes back — before the countdown
  // finishes if it responds quickly, or however long after 10s it takes if
  // it's slow. Never fires without a real result.
  useEffect(() => {
    if (isOpen && ready && !firedRef.current) {
      firedRef.current = true;
      onContinue();
    }
  }, [isOpen, ready, onContinue]);

  const handleContinueClick = () => {
    // Manual fallback for the button click — mirrors the effect above so it
    // can't close the modal ahead of an actual result either.
    if (!ready || firedRef.current) return;
    firedRef.current = true;
    onContinue();
  };

  // Computed separately (rather than inline in the JSX below) to keep the
  // Button's already-heavily-overloaded Chakra prop types from blowing past
  // TypeScript's union-complexity limit (TS2590) when combined with an
  // inline conditional expression.
  const continueDisabled: boolean = !ready;

  return (
    <Modal isOpen={isOpen} onClose={() => { }} size="sm" isCentered closeOnEsc={false} closeOnOverlayClick={false}>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(2px)" />
      <ModalContent border="1px solid #DEE2E6" borderRadius="lg" p={4}>
        <ModalBody>
          <VStack spacing={4} py={2}>
            <Box
              bg={BRAND_BLUE}
              borderRadius="full"
              width="64px"
              height="64px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={CheckCircleIcon} weight="fill" color="white" boxSize="36px" />
            </Box>
            <Heading size="md" textAlign="center" color="#1A202C">
              Nice one!
            </Heading>
            <Text textAlign="center" color="gray.600" fontSize="15px">
              {message}
            </Text>
            <Button
              width="100%"
              color="white"
              bg={BRAND_BLUE}
              _hover={{ bg: '#1D54B5' }}
              onClick={handleContinueClick}
              isDisabled={remaining > 0}
            >
              Continue
            </Button>
            <Text fontSize="13px" color="gray.500" textAlign="center">
              {remaining > 0
                ? `Redirecting to complete your upgrade in ${remaining}s...`
                : 'Still finalizing your upgrade...'}
            </Text>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};


export default CardUpdateSuccessModal;
